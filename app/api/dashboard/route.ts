import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardOverviewByUserId } from "@/lib/services/dashboard-service";
import { getReminderFeedByUserId } from "@/lib/services/reminder-service";
import { jsonError } from "@/lib/utils/api";

const searchParamsSchema = z.object({
  days: z.enum(["7", "30"]).default("7"),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  if (!user.profile) {
    return jsonError("用户资料不存在", 404);
  }

  const parseResult = searchParamsSchema.safeParse({
    days: new URL(request.url).searchParams.get("days") ?? "7",
  });

  if (!parseResult.success) {
    return jsonError("days 参数只支持 7 或 30", 400);
  }

  const days = Number(parseResult.data.days) as 7 | 30;
  const [overview, reminders] = await Promise.all([
    getDashboardOverviewByUserId(user.id, user.profile, [days]),
    getReminderFeedByUserId(user.id, user.profile),
  ]);

  return Response.json({
    dashboard: {
      todayDate: overview.todayDate,
      streakDays: overview.streakDays,
      todayCompletedMetrics: overview.todayCompletedMetrics,
      totalTrackedMetrics: overview.totalTrackedMetrics,
      todayMetrics: overview.todayMetrics,
      window: overview.windows[0],
    },
    reminders,
  });
}
