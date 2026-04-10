import { beforeEach, describe, expect, it, vi } from "vitest";

const createSession = vi.fn();
const loginUser = vi.fn();
const trackProductEventSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  createSession,
}));

vi.mock("@/lib/services/auth-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/auth-service")>(
    "@/lib/services/auth-service",
  );

  return {
    ...actual,
    loginUser,
  };
});

vi.mock("@/lib/services/observability-service", () => ({
  PRODUCT_EVENT_NAMES: {
    loginCompleted: "LOGIN_COMPLETED",
  },
  trackProductEventSafely,
}));

describe("login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in a user, creates a session, and tracks a successful login", async () => {
    loginUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      profile: {
        displayName: "Demo",
      },
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "demo@example.com",
          password: "password123",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith("user_1");
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "LOGIN_COMPLETED",
      path: "/login",
    });
    expect(data.user.displayName).toBe("Demo");
  });
});
