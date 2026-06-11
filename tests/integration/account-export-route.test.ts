import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getAccountExportByUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/account-service", () => ({
  getAccountExportByUserId,
}));

describe("account export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when exporting without a session", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/account/export/route");
    const response = await GET(
      new Request("http://localhost:3000/api/account/export"),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("returns the current account export", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });
    getAccountExportByUserId.mockResolvedValue({
      exportedAt: "2026-04-02T00:00:00.000Z",
      user: {
        id: "user_1",
      },
      goals: [
        {
          metric: "WEIGHT",
          mode: "IN_RANGE",
          isActive: true,
          targetValue: null,
          minValue: 60,
          maxValue: 65,
        },
      ],
      dailyRecords: [
        {
          date: "2026-04-02",
          isBackfilled: false,
          sleepHours: 7.5,
          weightKg: 63.2,
          waterMl: 1800,
          contextTags: {
            dietTags: ["LIGHT"],
            activityLevel: "NORMAL",
            energyLevel: null,
            weighTiming: "MORNING",
          },
          createdAt: "2026-04-02T08:00:00.000Z",
          updatedAt: "2026-04-02T08:00:00.000Z",
        },
      ],
      wechatIdentities: [
        {
          appId: "wx_app",
          openid: "openid_1",
          unionid: null,
          createdAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      productEvents: [
        {
          eventName: "ALPHA_FEEDBACK_SUBMITTED",
          path: "/mp/me",
          metadata: {
            rating: 5,
            valueCue: "trend-review",
            friction: "manual-entry",
          },
          createdAt: "2026-04-03T00:00:00.000Z",
        },
      ],
    });

    const { GET } = await import("@/app/api/account/export/route");
    const response = await GET(
      new Request("http://localhost:3000/api/account/export", {
        headers: {
          Authorization: "Bearer token",
        },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "personal-health-checker-account.json",
    );
    expect(getCurrentUser).toHaveBeenCalledWith(expect.any(Request));
    expect(getAccountExportByUserId).toHaveBeenCalledWith("user_1");
    expect(data).toMatchObject({
      user: {
        id: "user_1",
      },
      goals: [
        {
          metric: "WEIGHT",
          mode: "IN_RANGE",
          isActive: true,
          targetValue: null,
          minValue: 60,
          maxValue: 65,
        },
      ],
      dailyRecords: [
        {
          date: "2026-04-02",
          contextTags: {
            dietTags: ["LIGHT"],
            activityLevel: "NORMAL",
            energyLevel: null,
            weighTiming: "MORNING",
          },
        },
      ],
      wechatIdentities: [
        {
          appId: "wx_app",
          openid: "openid_1",
          unionid: null,
        },
      ],
      productEvents: [
        {
          eventName: "ALPHA_FEEDBACK_SUBMITTED",
          path: "/mp/me",
          metadata: {
            rating: 5,
            valueCue: "trend-review",
            friction: "manual-entry",
          },
        },
      ],
    });
  });
});
