import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getDashboardOverviewByUserId = vi.fn();
const getReminderFeedByUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/dashboard-service", () => ({
  getDashboardOverviewByUserId,
}));

vi.mock("@/lib/services/reminder-service", () => ({
  getReminderFeedByUserId,
}));

describe("dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not logged in", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/dashboard/route");
    const response = await GET(new Request("http://localhost:3000/api/dashboard?days=7"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("rejects unsupported window sizes", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
    });

    const { GET } = await import("@/app/api/dashboard/route");
    const response = await GET(new Request("http://localhost:3000/api/dashboard?days=14"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("days 参数只支持 7 或 30");
  });

  it("returns dashboard data for the requested window", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
    });
    getDashboardOverviewByUserId.mockResolvedValue({
      todayDate: "2026-04-03",
      streakDays: 4,
      todayCompletedMetrics: 3,
      totalTrackedMetrics: 3,
      todayMetrics: [],
      windows: [
        {
          days: 30,
          completionRate: 20,
        },
      ],
    });
    getReminderFeedByUserId.mockResolvedValue({
      enabled: true,
      todayDate: "2026-04-03",
      reminders: [
        {
          id: "missing-some-today",
          tone: "warning",
          title: "今天还有 1 项待补录",
          description: "还差饮水",
          actionHref: "/today",
          actionLabel: "继续补录",
        },
      ],
    });

    const { GET } = await import("@/app/api/dashboard/route");
    const response = await GET(new Request("http://localhost:3000/api/dashboard?days=30"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getDashboardOverviewByUserId).toHaveBeenCalledWith(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
      [30],
    );
    expect(getReminderFeedByUserId).toHaveBeenCalledWith("user_1", {
      timezone: "Asia/Shanghai",
      weightUnit: "KG",
      waterUnit: "ML",
    });
    expect(data.dashboard.window.days).toBe(30);
    expect(data.reminders.reminders).toHaveLength(1);
  });
});
