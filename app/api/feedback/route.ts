import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import {
  PRODUCT_EVENT_NAMES,
  trackProductEventSafely,
} from "@/lib/services/observability-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import { getRequestPlatform } from "@/lib/utils/request-platform";
import { alphaFeedbackSchema } from "@/lib/validations/feedback";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return jsonError("未登录", 401);
  }

  try {
    const body = alphaFeedbackSchema.parse(await request.json());
    const platform = getRequestPlatform(request);

    await trackProductEventSafely({
      userId: user.id,
      eventName: PRODUCT_EVENT_NAMES.alphaFeedbackSubmitted,
      path: body.source,
      metadata: {
        source: body.source,
        platform,
        rating: body.rating,
        valueCue: body.valueCue,
        friction: body.friction,
        hasComment: body.comment.length > 0,
        comment: body.comment || null,
      },
    });

    return Response.json({
      success: true,
      message: "反馈已收到，谢谢。",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    console.error("feedback submit error", error);
    return jsonError("提交反馈失败，请稍后再试", 500);
  }
}
