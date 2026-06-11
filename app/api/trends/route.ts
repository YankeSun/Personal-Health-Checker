import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { trackProductPageViewSafely } from "@/lib/services/observability-service";
import { getTrendOverviewByUserId } from "@/lib/services/trends-service";
import { jsonError } from "@/lib/utils/api";
import { getRequestPlatform } from "@/lib/utils/request-platform";
import { trendDaysSchema, trendMetricSchema } from "@/lib/validations/trends";

const searchParamsSchema = z.object({
  metric: trendMetricSchema.default("sleep"),
  days: trendDaysSchema.default("30"),
});

export async function GET(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return jsonError("未登录", 401);
  }

  if (!user.profile) {
    return jsonError("用户资料不存在", 404);
  }

  const parseResult = searchParamsSchema.safeParse({
    metric: new URL(request.url).searchParams.get("metric") ?? "sleep",
    days: new URL(request.url).searchParams.get("days") ?? "30",
  });

  if (!parseResult.success) {
    return jsonError("metric 或 days 参数不正确", 400);
  }

  const platform = getRequestPlatform(request);
  const trend = await getTrendOverviewByUserId(
    user.id,
    user.profile,
    parseResult.data.metric,
    Number(parseResult.data.days) as 7 | 30,
  );

  if (platform === "wechat_mp") {
    await trackProductPageViewSafely(user.id, "/trends", {
      platform,
      metric: parseResult.data.metric,
      days: Number(parseResult.data.days),
    });
  }

  return Response.json({ trend });
}
