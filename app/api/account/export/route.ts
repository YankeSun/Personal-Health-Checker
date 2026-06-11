import { getCurrentUser } from "@/lib/auth/session";
import { getAccountExportByUserId } from "@/lib/services/account-service";
import { jsonError } from "@/lib/utils/api";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return jsonError("未登录", 401);
  }

  const accountExport = await getAccountExportByUserId(user.id);

  if (!accountExport) {
    return jsonError("账号不存在", 404);
  }

  return Response.json(accountExport, {
    headers: {
      "Content-Disposition": "attachment; filename=\"personal-health-checker-account.json\"",
    },
  });
}
