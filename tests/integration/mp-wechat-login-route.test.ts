import { beforeEach, describe, expect, it, vi } from "vitest";

const createSession = vi.fn();
const loginWechatMiniProgramUser = vi.fn();
const trackProductEventSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  createSession,
}));

vi.mock("@/lib/services/wechat-auth-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/wechat-auth-service")>(
    "@/lib/services/wechat-auth-service",
  );

  return {
    ...actual,
    loginWechatMiniProgramUser,
  };
});

vi.mock("@/lib/services/observability-service", () => ({
  PRODUCT_EVENT_NAMES: {
    wechatLoginCompleted: "WECHAT_LOGIN_COMPLETED",
  },
  trackProductEventSafely,
}));

describe("mini program wechat login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in with a WeChat code and returns a bearer token", async () => {
    loginWechatMiniProgramUser.mockResolvedValue({
      user: {
        id: "user_1",
        profile: {
          displayName: "微信用户",
        },
      },
      isNewUser: true,
    });
    createSession.mockResolvedValue({
      token: "bearer_token",
      expiresAt: new Date("2026-05-01T00:00:00.000Z"),
    });

    const { POST } = await import("@/app/api/mp/auth/wechat-login/route");
    const response = await POST(
      new Request("http://localhost:3000/api/mp/auth/wechat-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: "wx_login_code",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(loginWechatMiniProgramUser).toHaveBeenCalledWith({
      code: "wx_login_code",
    });
    expect(createSession).toHaveBeenCalledWith("user_1", { setCookie: false });
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "WECHAT_LOGIN_COMPLETED",
      path: "/api/mp/auth/wechat-login",
      metadata: {
        platform: "wechat_mp",
        isNewUser: true,
      },
    });
    expect(data).toEqual({
      token: "bearer_token",
      expiresAt: "2026-05-01T00:00:00.000Z",
      user: {
        id: "user_1",
        displayName: "微信用户",
      },
      isNewUser: true,
    });
  });

  it("validates the login code", async () => {
    const { POST } = await import("@/app/api/mp/auth/wechat-login/route");
    const response = await POST(
      new Request("http://localhost:3000/api/mp/auth/wechat-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: "",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("缺少微信登录 code");
    expect(loginWechatMiniProgramUser).not.toHaveBeenCalled();
  });
});
