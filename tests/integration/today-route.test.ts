import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getTodayRecordByUserId = vi.fn();
const upsertDailyRecordByUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/daily-record-service", () => ({
  getTodayRecordByUserId,
  upsertDailyRecordByUserId,
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
    });

    const { GET } = await import("@/app/api/records/today/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getTodayRecordByUserId).toHaveBeenCalledWith("user_1", "Asia/Shanghai");
    expect(data.record.sleepHours).toBe(7.2);
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
    upsertDailyRecordByUserId.mockResolvedValue({
      id: "record_1",
      date: "2026-04-03",
      sleepHours: 7.5,
      weightKg: 63.2,
      waterMl: 2000,
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
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(upsertDailyRecordByUserId).toHaveBeenCalledWith("user_1", {
      date: "2026-04-03",
      sleepHours: 7.5,
      weightKg: 63.2,
      waterMl: 2000,
    });
    expect(data.record.waterMl).toBe(2000);

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
