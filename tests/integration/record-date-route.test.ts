import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getDailyRecordByUserAndDate = vi.fn();
const upsertDailyRecordByUserId = vi.fn();
const deleteDailyRecordByUserAndDate = vi.fn();
const getDailyRecordMilestonesByUserId = vi.fn();
const trackProductEventSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/daily-record-service", () => ({
  getDailyRecordByUserAndDate,
  getDailyRecordMilestonesByUserId,
  upsertDailyRecordByUserId,
  deleteDailyRecordByUserAndDate,
}));

vi.mock("@/lib/services/observability-service", () => ({
  PRODUCT_EVENT_NAMES: {
    dailyRecordSaved: "DAILY_RECORD_SAVED",
    firstRecordSaved: "FIRST_RECORD_SAVED",
    firstCompleteRecordSaved: "FIRST_COMPLETE_RECORD_SAVED",
  },
  trackProductEventSafely,
}));

describe("record-by-date route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when reading without a session", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/records/[date]/route");
    const response = await GET(new Request("http://localhost:3000/api/records/2026-04-03"), {
      params: Promise.resolve({
        date: "2026-04-03",
      }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("returns the requested day's fallback payload when no record exists", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
      },
    });
    getDailyRecordByUserAndDate.mockResolvedValue(null);

    const { GET } = await import("@/app/api/records/[date]/route");
    const response = await GET(new Request("http://localhost:3000/api/records/2026-04-03"), {
      params: Promise.resolve({
        date: "2026-04-03",
      }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getDailyRecordByUserAndDate).toHaveBeenCalledWith("user_1", "2026-04-03");
    expect(data.record).toEqual({
      date: "2026-04-03",
      sleepHours: null,
      weightKg: null,
      waterMl: null,
    });
  });

  it("updates one historical record by date", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
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
      date: "2026-04-02",
      sleepHours: 7.1,
      weightKg: 63.2,
      waterMl: 1800,
    });

    const { PUT } = await import("@/app/api/records/[date]/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/records/2026-04-02", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sleepHours: 7.1,
          weightKg: 63.2,
          waterMl: 1800,
        }),
      }),
      {
        params: Promise.resolve({
          date: "2026-04-02",
        }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(upsertDailyRecordByUserId).toHaveBeenCalledWith("user_1", {
      date: "2026-04-02",
      sleepHours: 7.1,
      weightKg: 63.2,
      waterMl: 1800,
    });
    expect(trackProductEventSafely).toHaveBeenCalledTimes(3);
    expect(data.record.date).toBe("2026-04-02");
  });

  it("rejects future dates", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
      },
    });

    const { PUT } = await import("@/app/api/records/[date]/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/records/2026-04-05", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sleepHours: 7.1,
          weightKg: null,
          waterMl: null,
        }),
      }),
      {
        params: Promise.resolve({
          date: "2026-04-05",
        }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("不能记录未来日期");
  });

  it("validates at least one field for updates", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
      },
    });

    const { PUT } = await import("@/app/api/records/[date]/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/records/2026-04-02", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sleepHours: null,
          weightKg: null,
          waterMl: null,
        }),
      }),
      {
        params: Promise.resolve({
          date: "2026-04-02",
        }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("至少填写一项记录");
  });

  it("deletes one record by date", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
      },
    });
    deleteDailyRecordByUserAndDate.mockResolvedValue({
      deleted: true,
    });

    const { DELETE } = await import("@/app/api/records/[date]/route");
    const response = await DELETE(
      new Request("http://localhost:3000/api/records/2026-04-02", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({
          date: "2026-04-02",
        }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(deleteDailyRecordByUserAndDate).toHaveBeenCalledWith("user_1", "2026-04-02");
    expect(data.deleted).toBe(true);
  });
});
