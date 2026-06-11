import { clearSession, getCurrentUser } from "@/lib/auth/session";
import { deleteUserAccountByUserId } from "@/lib/services/account-service";
import { jsonError } from "@/lib/utils/api";

export async function DELETE(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return jsonError("未登录", 401);
  }

  try {
    await deleteUserAccountByUserId(user.id);
    await clearSession(request);

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("account delete error", error);
    return jsonError("删除账号失败，请稍后再试", 500);
  }
}
