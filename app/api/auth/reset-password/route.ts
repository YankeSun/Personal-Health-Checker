import { ZodError } from "zod";

import { resetPasswordWithToken } from "@/lib/services/account-security-service";
import { AuthError } from "@/lib/services/auth-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = resetPasswordSchema.parse(await request.json());
    await resetPasswordWithToken(body.token, body.password);

    return Response.json({
      message: "密码已更新，请重新登录。",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    if (error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }

    console.error("reset password error", error);
    return jsonError("密码重置失败，请稍后再试", 500);
  }
}
