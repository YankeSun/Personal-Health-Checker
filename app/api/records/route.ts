import { getCurrentUser } from "@/lib/auth/session";
import { getDailyRecordsByUserAndDateRange } from "@/lib/services/daily-record-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import { recordsQuerySchema } from "@/lib/validations/records";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  const parseResult = recordsQuerySchema.safeParse({
    from: new URL(request.url).searchParams.get("from"),
    to: new URL(request.url).searchParams.get("to"),
  });

  if (!parseResult.success) {
    return jsonError(getZodErrorMessage(parseResult.error), 400);
  }

  const records = await getDailyRecordsByUserAndDateRange(
    user.id,
    parseResult.data.from,
    parseResult.data.to,
  );

  return Response.json({ records });
}
