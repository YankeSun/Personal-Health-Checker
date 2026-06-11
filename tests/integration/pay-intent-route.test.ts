import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const trackProductEventSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/observability-service", () => ({
  PRODUCT_EVENT_NAMES: {
    payIntentClicked: "PAY_INTENT_CLICKED",
  },
  trackProductEventSafely,
}));

describe("pay intent route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when recording intent without a session", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { POST } = await import("@/app/api/intent/pay/route");
    const response = await POST(
      new Request("http://localhost:3000/api/intent/pay", {
        method: "POST",
        body: JSON.stringify({
          offer: "WEIGHT_REPORT_30D",
          source: "/dashboard",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
    expect(trackProductEventSafely).not.toHaveBeenCalled();
  });

  it("records a web pay intent event without creating a payment", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });

    const { POST } = await import("@/app/api/intent/pay/route");
    const response = await POST(
      new Request("http://localhost:3000/api/intent/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer: "WEIGHT_REPORT_30D",
          source: "/dashboard",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      success: true,
      status: "waitlist",
    });
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "PAY_INTENT_CLICKED",
      path: "/dashboard",
      metadata: {
        offer: "WEIGHT_REPORT_30D",
        source: "/dashboard",
        platform: "web",
      },
    });
  });

  it("records mini program pay intent with platform metadata", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });

    const { POST } = await import("@/app/api/intent/pay/route");
    const response = await POST(
      new Request("http://localhost:3000/api/intent/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({
          offer: "WEIGHT_REPORT_30D",
          source: "wechat_mp/me",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(trackProductEventSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          platform: "wechat_mp",
        }),
      }),
    );
  });

  it("validates supported pay intent offers", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });

    const { POST } = await import("@/app/api/intent/pay/route");
    const response = await POST(
      new Request("http://localhost:3000/api/intent/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer: "UNKNOWN",
          source: "/dashboard",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });
});
