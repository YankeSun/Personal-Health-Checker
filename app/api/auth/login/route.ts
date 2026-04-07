import { ZodError } from "zod";

import { createSession } from "@/lib/auth/session";
import { loginUser, AuthError } from "@/lib/services/auth-service";
import { jsonError, getZodErrorMessage } from "@/lib/utils/api";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await loginUser(body);

    await createSession(user.id);

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    if (error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }

    console.error("login error", error);
    return jsonError("登录失败，请稍后再试", 500);
  }
}
