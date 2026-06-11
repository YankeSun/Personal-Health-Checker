import { ZodError } from "zod";

import { createSession } from "@/lib/auth/session";
import {
  PRODUCT_EVENT_NAMES,
  trackProductEventSafely,
} from "@/lib/services/observability-service";
import {
  loginWechatMiniProgramUser,
  WechatAuthError,
} from "@/lib/services/wechat-auth-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import { wechatLoginSchema } from "@/lib/validations/mp-auth";

export async function POST(request: Request) {
  try {
    const body = wechatLoginSchema.parse(await request.json());
    const { user, isNewUser } = await loginWechatMiniProgramUser(body);
    const session = await createSession(user.id, { setCookie: false });

    await trackProductEventSafely({
      userId: user.id,
      eventName: PRODUCT_EVENT_NAMES.wechatLoginCompleted,
      path: "/api/mp/auth/wechat-login",
      metadata: {
        platform: "wechat_mp",
        isNewUser,
      },
    });

    return Response.json({
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: user.id,
        displayName: user.profile?.displayName ?? "微信用户",
      },
      isNewUser,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    if (error instanceof WechatAuthError) {
      return jsonError(error.message, error.status);
    }

    console.error("wechat mini program login error", error);
    return jsonError("微信登录失败，请稍后再试", 500);
  }
}
