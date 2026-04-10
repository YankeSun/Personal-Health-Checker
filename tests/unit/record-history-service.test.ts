import { beforeEach, describe, expect, it, vi } from "vitest";

const getDailyRecordsByUserAndDateRange = vi.fn();

vi.mock("@/lib/services/daily-record-service", () => ({
  getDailyRecordsByUserAndDateRange,
}));

describe("record-history-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T09:00:00.000Z"));
  });

  it("builds a reverse chronological history window with display values", async () => {
    getDailyRecordsByUserAndDateRange.mockResolvedValue([
      {
        id: "record_1",
        date: "2026-04-04",
        sleepHours: 7.5,
        weightKg: 63.2,
        waterMl: 1800,
        isBackfilled: false,
      },
      {
        id: "record_2",
        date: "2026-04-03",
        sleepHours: null,
        weightKg: 63.1,
        waterMl: 2000,
        isBackfilled: true,
      },
    ]);

    const { getRecordHistoryWindowByUserId } = await import(
      "@/lib/services/record-history-service"
    );
    const history = await getRecordHistoryWindowByUserId(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
      7,
    );

    expect(getDailyRecordsByUserAndDateRange).toHaveBeenCalledWith(
      "user_1",
      "2026-03-29",
      "2026-04-04",
    );
    expect(history.completeDays).toBe(1);
    expect(history.partialDays).toBe(1);
    expect(history.emptyDays).toBe(5);
    expect(history.rows[0]).toMatchObject({
      date: "2026-04-04",
      sleepDisplay: "7.5",
      weightDisplay: "63.2",
      waterDisplay: "1800",
      completedMetrics: 3,
      isComplete: true,
      isBackfilled: false,
    });
    expect(history.rows[1]).toMatchObject({
      date: "2026-04-03",
      sleepDisplay: null,
      weightDisplay: "63.1",
      waterDisplay: "2000",
      completedMetrics: 2,
      hasAnyRecord: true,
      isComplete: false,
      isBackfilled: true,
    });
  });
});
