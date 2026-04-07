import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { getProfileByUserId, updateProfileByUserId } from "@/lib/services/profile-service";
import { jsonError, getZodErrorMessage } from "@/lib/utils/api";
import { profileSchema } from "@/lib/validations/profile";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  const profile = await getProfileByUserId(user.id);

  if (!profile) {
    return jsonError("用户资料不存在", 404);
  }

  return Response.json({
    profile: {
      email: user.email,
      displayName: profile.displayName,
      timezone: profile.timezone,
      weightUnit: profile.weightUnit,
      waterUnit: profile.waterUnit,
      reminderEnabled: profile.reminderEnabled,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  try {
    const body = profileSchema.parse(await request.json());
    const profile = await updateProfileByUserId(user.id, body);

    return Response.json({
      profile: {
        email: user.email,
        displayName: profile.displayName,
        timezone: profile.timezone,
        weightUnit: profile.weightUnit,
        waterUnit: profile.waterUnit,
        reminderEnabled: profile.reminderEnabled,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    console.error("profile update error", error);
    return jsonError("保存资料失败，请稍后再试", 500);
  }
}
