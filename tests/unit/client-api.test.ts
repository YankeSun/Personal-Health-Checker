import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "@/lib/utils/client-api";

describe("getApiErrorMessage", () => {
  it("prefers JSON error messages", async () => {
    const response = new Response(JSON.stringify({ error: "邮箱已存在" }), {
      status: 409,
      headers: {
        "Content-Type": "application/json",
      },
    });

    await expect(
      getApiErrorMessage(response, "注册失败，请稍后再试"),
    ).resolves.toBe("邮箱已存在");
  });

  it("returns a clear message for protected preview deployments", async () => {
    const response = new Response("<html><title>Authentication Required</title></html>", {
      status: 401,
      headers: {
        "Content-Type": "text/html",
      },
    });

    await expect(
      getApiErrorMessage(response, "注册失败，请稍后再试"),
    ).resolves.toBe("当前版本受访问保护，请从正式站点体验账号功能。");
  });

  it("falls back to a service-level message for server errors", async () => {
    const response = new Response("<html>gateway error</html>", {
      status: 503,
      headers: {
        "Content-Type": "text/html",
      },
    });

    await expect(
      getApiErrorMessage(response, "注册失败，请稍后再试"),
    ).resolves.toBe("服务暂时不可用，请稍后再试。");
  });
});
