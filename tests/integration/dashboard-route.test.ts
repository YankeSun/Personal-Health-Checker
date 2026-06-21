import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getDashboardOverviewByUserId = vi.fn();
const getReminderFeedByUserId = vi.fn();
const trackProductPageViewSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/dashboard-service", () => ({
  getDashboardOverviewByUserId,
}));

vi.mock("@/lib/services/reminder-service", () => ({
  getReminderFeedByUserId,
}));

vi.mock("@/lib/services/observability-service", () => ({
  trackProductPageViewSafely,
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
      insights: [
        {
          id: "today-focus",
          tone: "success",
          title: "已连续 4 天",
          description: "继续保持今日记录。",
          actionHref: "/trends",
          actionLabel: "看最近趋势",
        },
      ],
      weightContext: {
        days: 7,
        recordedDays: 4,
        latestDisplay: "63.2 kg",
        changeDisplay: "-0.5 kg",
        trend: "down",
        title: "最近 7 天体重有所下降",
        description: "窗口内记录了 4/7 天。",
        topContextLabels: [
          {
            label: "晨起",
            count: 3,
          },
        ],
      },
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
          title: "今天还差 1 项",
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
    expect(trackProductPageViewSafely).not.toHaveBeenCalled();
    expect(data.dashboard.window.days).toBe(30);
    expect(data.dashboard.insights[0].id).toBe("today-focus");
    expect(data.dashboard.weightContext.title).toBe("最近 7 天体重有所下降");
    expect(data.reminders.reminders).toHaveLength(1);
  });

  it("tracks dashboard page view for mini program bearer requests", async () => {
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
          days: 7,
          completionRate: 20,
        },
      ],
    });
    getReminderFeedByUserId.mockResolvedValue({
      enabled: true,
      todayDate: "2026-04-03",
      reminders: [],
    });

    const { GET } = await import("@/app/api/dashboard/route");
    const response = await GET(
      new Request("http://localhost:3000/api/dashboard?days=7", {
        headers: {
          Authorization: "Bearer token",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(trackProductPageViewSafely).toHaveBeenCalledWith("user_1", "/dashboard", {
      platform: "wechat_mp",
      days: 7,
    });
  });
});
