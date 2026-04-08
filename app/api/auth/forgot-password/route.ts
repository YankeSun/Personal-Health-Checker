import { ZodError } from "zod";

import { requestPasswordReset } from "@/lib/services/account-security-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = forgotPasswordSchema.parse(await request.json());
    await requestPasswordReset(body.email, new URL(request.url).origin);

    return Response.json({
      message: "如果该邮箱已注册，我们已发送重置链接。",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    console.error("forgot password error", error);
    return jsonError("暂时无法发起密码重置，请稍后再试", 500);
  }
}
