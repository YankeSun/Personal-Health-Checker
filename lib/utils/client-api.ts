"use client";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const PREVIEW_PROTECTION_PATTERNS = [
  "Authentication Required",
  "Deployment Protection",
  "Vercel Authentication",
];

export async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string,
) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response
      .json()
      .catch(() => null)) as ApiErrorPayload | null;

    return payload?.error ?? payload?.message ?? fallbackMessage;
  }

  const text = await response.text().catch(() => "");

  if (
    response.status === 401 &&
    PREVIEW_PROTECTION_PATTERNS.some((pattern) => text.includes(pattern))
  ) {
    return "当前版本受访问保护，请从正式站点体验账号功能。";
  }

  if (response.status >= 500) {
    return "服务暂时不可用，请稍后再试。";
  }

  return fallbackMessage;
}
