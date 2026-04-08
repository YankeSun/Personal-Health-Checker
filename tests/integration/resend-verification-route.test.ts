import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const issueEmailVerification = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/account-security-service", () => ({
  issueEmailVerification,
}));

describe("resend-verification route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires an authenticated user", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { POST } = await import("@/app/api/auth/resend-verification/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("请先登录后再发送验证邮件");
  });

  it("resends a verification link for the current user", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
    });
    issueEmailVerification.mockResolvedValue({
      alreadyVerified: false,
    });

    const { POST } = await import("@/app/api/auth/resend-verification/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(issueEmailVerification).toHaveBeenCalledWith(
      "user_1",
      "http://localhost:3000",
    );
    expect(data.message).toBe("验证链接已重新发送。");
  });
});
