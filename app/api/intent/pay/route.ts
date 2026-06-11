import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import {
  PRODUCT_EVENT_NAMES,
  trackProductEventSafely,
} from "@/lib/services/observability-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import { getRequestPlatform } from "@/lib/utils/request-platform";
import { payIntentSchema } from "@/lib/validations/pay-intent";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return jsonError("未登录", 401);
  }

  try {
    const body = payIntentSchema.parse(await request.json());
    const platform = getRequestPlatform(request);

    await trackProductEventSafely({
      userId: user.id,
      eventName:
        body.action === "shown"
          ? PRODUCT_EVENT_NAMES.payIntentShown
          : PRODUCT_EVENT_NAMES.payIntentClicked,
      path: body.source,
      metadata: {
        action: body.action,
        offer: body.offer,
        source: body.source,
        platform,
      },
    });

    if (body.action === "shown") {
      return Response.json({
        success: true,
        status: "tracked",
      });
    }

    return Response.json({
      success: true,
      status: "waitlist",
      message: "已记录你的内测意向，开放时会优先通知。",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    console.error("pay intent error", error);
    return jsonError("记录内测意向失败，请稍后再试", 500);
  }
}
