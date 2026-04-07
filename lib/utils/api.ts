import { ZodError } from "zod";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function getZodErrorMessage(error: ZodError) {
  return error.issues[0]?.message ?? "请求参数不正确";
}
