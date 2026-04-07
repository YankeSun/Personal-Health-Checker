import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { getGoalsByUserId, upsertGoalsByUserId } from "@/lib/services/goals-service";
import { jsonError, getZodErrorMessage } from "@/lib/utils/api";
import { goalsSchema } from "@/lib/validations/goals";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  return Response.json({
    goals: await getGoalsByUserId(user.id),
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  try {
    const body = goalsSchema.parse(await request.json());
    const goals = await upsertGoalsByUserId(user.id, body);

    return Response.json({ goals });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    console.error("goals update error", error);
    return jsonError("保存目标失败，请稍后再试", 500);
  }
}
