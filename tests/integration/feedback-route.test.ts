import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const trackProductEventSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/observability-service", () => ({
  PRODUCT_EVENT_NAMES: {
    alphaFeedbackSubmitted: "ALPHA_FEEDBACK_SUBMITTED",
  },
  trackProductEventSafely,
}));

describe("feedback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires login", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { POST } = await import("@/app/api/feedback/route");
    const response = await POST(
      new Request("http://localhost:3000/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          source: "wechat_mp/me",
          rating: 4,
          valueCue: "KEEP_RECORDING",
          friction: "NO_FRICTION",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
    expect(trackProductEventSafely).not.toHaveBeenCalled();
  });

  it("records mini program alpha feedback as a product event", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });

    const { POST } = await import("@/app/api/feedback/route");
    const response = await POST(
      new Request("http://localhost:3000/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({
          source: "wechat_mp/me",
          rating: 5,
          valueCue: "UNDERSTAND_WEIGHT",
          friction: "FORGET_TO_RECORD",
          comment: "能看到体重波动原因，但希望提醒更明显。",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "ALPHA_FEEDBACK_SUBMITTED",
      path: "wechat_mp/me",
      metadata: {
        source: "wechat_mp/me",
        platform: "wechat_mp",
        rating: 5,
        valueCue: "UNDERSTAND_WEIGHT",
        friction: "FORGET_TO_RECORD",
        hasComment: true,
        comment: "能看到体重波动原因，但希望提醒更明显。",
      },
    });
  });

  it("validates feedback payload", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });

    const { POST } = await import("@/app/api/feedback/route");
    const response = await POST(
      new Request("http://localhost:3000/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "wechat_mp/me",
          rating: 6,
          valueCue: "UNKNOWN",
          friction: "NO_FRICTION",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
    expect(trackProductEventSafely).not.toHaveBeenCalled();
  });
});
