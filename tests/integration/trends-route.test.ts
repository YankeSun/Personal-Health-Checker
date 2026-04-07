import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getTrendOverviewByUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/trends-service", () => ({
  getTrendOverviewByUserId,
}));

describe("trends route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not logged in", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/trends/route");
    const response = await GET(
      new Request("http://localhost:3000/api/trends?metric=sleep&days=7"),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("rejects invalid params", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
    });

    const { GET } = await import("@/app/api/trends/route");
    const response = await GET(
      new Request("http://localhost:3000/api/trends?metric=heart&days=14"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("metric 或 days 参数不正确");
  });

  it("returns trend data for the requested metric and window", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
    });
    getTrendOverviewByUserId.mockResolvedValue({
      metric: "sleep",
      metricLabel: "睡眠",
      unitLabel: "小时",
      days: 30,
      startDate: "2026-03-05",
      endDate: "2026-04-03",
      recordedDays: 12,
      completionRate: 40,
      attainmentRate: 23.3,
      averageDisplay: "7.3",
      latestDisplay: "7.8",
      minDisplay: "6.5",
      maxDisplay: "8.4",
      goalDescription: "至少 7.5 小时",
      points: [],
    });

    const { GET } = await import("@/app/api/trends/route");
    const response = await GET(
      new Request("http://localhost:3000/api/trends?metric=sleep&days=30"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getTrendOverviewByUserId).toHaveBeenCalledWith(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
      "sleep",
      30,
    );
    expect(data.trend.metric).toBe("sleep");
  });
});
