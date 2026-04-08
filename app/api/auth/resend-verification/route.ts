import { getCurrentUser } from "@/lib/auth/session";
import { issueEmailVerification } from "@/lib/services/account-security-service";
import { AuthError } from "@/lib/services/auth-service";
import { jsonError } from "@/lib/utils/api";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("请先登录后再发送验证邮件", 401);
    }

    const result = await issueEmailVerification(user.id, new URL(request.url).origin);

    return Response.json({
      message: result.alreadyVerified
        ? "邮箱已经完成验证。"
        : "验证链接已重新发送。",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }

    console.error("resend verification error", error);
    return jsonError("暂时无法发送验证邮件，请稍后再试", 500);
  }
}
