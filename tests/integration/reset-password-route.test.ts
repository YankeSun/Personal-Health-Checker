import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError } from "@/lib/services/auth-service";

const resetPasswordWithToken = vi.fn();

vi.mock("@/lib/services/account-security-service", () => ({
  resetPasswordWithToken,
}));

describe("reset-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets the password with a valid token", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "token",
          password: "Password123",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(resetPasswordWithToken).toHaveBeenCalledWith("token", "Password123");
    expect(data.message).toBe("密码已更新，请重新登录。");
  });

  it("returns the auth error for invalid tokens", async () => {
    resetPasswordWithToken.mockRejectedValue(
      new AuthError("重置链接无效或已过期", 400),
    );

    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "token",
          password: "Password123",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("重置链接无效或已过期");
  });
});
