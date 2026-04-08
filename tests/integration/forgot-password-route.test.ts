import { beforeEach, describe, expect, it, vi } from "vitest";

const requestPasswordReset = vi.fn();

vi.mock("@/lib/services/account-security-service", () => ({
  requestPasswordReset,
}));

describe("forgot-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a valid email and always returns success", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "demo@example.com",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(requestPasswordReset).toHaveBeenCalledWith(
      "demo@example.com",
      "http://localhost:3000",
    );
    expect(data.message).toBe("如果该邮箱已注册，我们已发送重置链接。");
  });

  it("validates the email payload", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "nope",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
