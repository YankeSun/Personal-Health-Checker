export type RequestPlatform = "web" | "wechat_mp";

export function getRequestPlatform(request?: Request): RequestPlatform {
  const authorization = request?.headers.get("authorization");

  return authorization?.toLowerCase().startsWith("bearer ") ? "wechat_mp" : "web";
}
