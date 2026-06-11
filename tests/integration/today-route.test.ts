import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getTodayRecordByUserId = vi.fn();
const upsertDailyRecordByUserId = vi.fn();
const getDailyRecordMilestonesByUserId = vi.fn();
const trackProductEventSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/daily-record-service", () => ({
  getTodayRecordByUserId,
  getDailyRecordMilestonesByUserId,
  upsertDailyRecordByUserId,
}));

vi.mock("@/lib/services/observability-service", () => ({
  PRODUCT_EVENT_NAMES: {
    recordFormStarted: "RECORD_FORM_STARTED",
    recordSaveAttempted: "RECORD_SAVE_ATTEMPTED",
    dailyRecordSaved: "DAILY_RECORD_SAVED",
    firstRecordSaved: "FIRST_RECORD_SAVED",
    firstCompleteRecordSaved: "FIRST_COMPLETE_RECORD_SAVED",
    contextTagsSaved: "CONTEXT_TAGS_SAVED",
  },
  trackProductEventSafely,
}));

describe("today record route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not logged in", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/records/today/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("returns today's record for the active user", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      profile: {
        timezone: "Asia/Shanghai",
      },
    });
    getTodayRecordByUserId.mockResolvedValue({
      id: "record_1",
      date: "2026-04-03",
      sleepHours: 7.2,
      weightKg: 63.4,
      waterMl: 1900,
      contextTags: {
        dietTags: ["NORMAL"],
        activityLevel: "NORMAL",
        energyLevel: null,
        weighTiming: "MORNING",
      },
    });

    const { GET } = await import("@/app/api/records/today/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getTodayRecordByUserId).toHaveBeenCalledWith("user_1", "Asia/Shanghai");
    expect(data.record.sleepHours).toBe(7.2);
    expect(data.record.contextTags.dietTags).toEqual(["NORMAL"]);
    expect(data.qualityWarnings).toEqual([]);
  });

  it("updates today's record for the active user", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00.000Z"));

    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      profile: {
        timezone: "Asia/Shanghai",
      },
    });
    getDailyRecordMilestonesByUserId.mockResolvedValue({
      hasAnyRecord: false,
      hasCompleteRecord: false,
    });
    upsertDailyRecordByUserId.mockResolvedValue({
      id: "record_1",
      date: "2026-04-03",
      sleepHours: 7.5,
      weightKg: 63.2,
      waterMl: 2000,
      isBackfilled: false,
      contextTags: {
        dietTags: ["LIGHT"],
        activityLevel: null,
        energyLevel: "GOOD",
        weighTiming: "MORNING",
      },
    });

    const { PUT } = await import("@/app/api/records/today/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/records/today", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: "2026-04-03",
          sleepHours: 7.5,
          weightKg: 63.2,
          waterMl: 2000,
          contextTags: {
            dietTags: ["LIGHT"],
            activityLevel: null,
            energyLevel: "GOOD",
            weighTiming: "MORNING",
          },
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(upsertDailyRecordByUserId).toHaveBeenCalledWith(
      "user_1",
      {
        date: "2026-04-03",
        sleepHours: 7.5,
        weightKg: 63.2,
        waterMl: 2000,
        contextTags: {
          dietTags: ["LIGHT"],
          activityLevel: null,
          energyLevel: "GOOD",
          weighTiming: "MORNING",
        },
      },
      {
        isBackfilled: false,
      },
    );
    expect(data.record.waterMl).toBe(2000);
    expect(data.record.contextTags.energyLevel).toBe("GOOD");
    expect(data.qualityWarnings).toEqual([]);
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "RECORD_SAVE_ATTEMPTED",
      path: "/today",
      metadata: {
        date: "2026-04-03",
        completedMetrics: 3,
        isToday: true,
        contextTagCount: 3,
        hasContextTags: true,
        platform: "web",
      },
    });
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "DAILY_RECORD_SAVED",
      path: "/today",
      metadata: {
        date: "2026-04-03",
        completedMetrics: 3,
        isToday: true,
        isBackfilled: false,
        contextTagCount: 3,
        hasContextTags: true,
        platform: "web",
      },
    });
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "FIRST_RECORD_SAVED",
      path: "/today",
      metadata: {
        date: "2026-04-03",
        platform: "web",
      },
    });
    expect(trackProductEventSafely).toHaveBeenCalledWith({
      userId: "user_1",
      eventName: "FIRST_COMPLETE_RECORD_SAVED",
      path: "/today",
      metadata: {
        date: "2026-04-03",
        platform: "web",
      },
    });

    vi.useRealTimers();
  });

  it("rejects records that are not for today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00.000Z"));

    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      profile: {
        timezone: "Asia/Shanghai",
      },
    });

    const { PUT } = await import("@/app/api/records/today/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/records/today", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: "2026-04-02",
          sleepHours: 7.5,
          weightKg: 63.2,
          waterMl: 2000,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("只能保存今天的记录");

    vi.useRealTimers();
  });

  it("validates that at least one field is present", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00.000Z"));

    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      profile: {
        timezone: "Asia/Shanghai",
      },
    });

    const { PUT } = await import("@/app/api/records/today/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/records/today", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: "2026-04-03",
          sleepHours: null,
          weightKg: null,
          waterMl: null,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("至少填写一项记录");

    vi.useRealTimers();
  });
});
