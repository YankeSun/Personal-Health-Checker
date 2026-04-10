import { beforeEach, describe, expect, it, vi } from "vitest";

const createSession = vi.fn();
const issueEmailVerification = vi.fn();
const registerUser = vi.fn();
const trackProductEventSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  createSession,
}));

vi.mock("@/lib/services/account-security-service", () => ({
  issueEmailVerification,
}));

vi.mock("@/lib/services/auth-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/auth-service")>(
    "@/lib/services/auth-service",
  );

  return {
    ...actual,
    registerUser,
  };
});

vi.mock("@/lib/services/observability-service", () => ({
  PRODUCT_EVENT_NAMES: {
    signUpCompleted: "SIGN_UP_COMPLETED",
  },
  trackProductEventSafely,
}));

describe("register route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a user, creates a session, and tracks sign-up completion", async () => {
    registerUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      emailVerifiedAt: null,
      profile: {
        displayName: "Demo",
      },
    });

    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "demo@example.com",
          password: "password123",
          displayName: "Demo",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith("user_1");
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "SIGN_UP_COMPLETED",
      path: "/register",
    });
    expect(issueEmailVerification).toHaveBeenCalledWith(
      "user_1",
      "http://localhost:3000",
    );
    expect(data.user.email).toBe("demo@example.com");
  });
});
