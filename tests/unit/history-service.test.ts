import { beforeEach, describe, expect, it, vi } from "vitest";

const getDailyRecordsByUserAndDateRange = vi.fn();

vi.mock("@/lib/services/daily-record-service", () => ({
  getDailyRecordsByUserAndDateRange,
}));

describe("history-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T09:00:00.000Z"));
  });

  it("builds a month overview with calendar, rows, and month navigation", async () => {
    getDailyRecordsByUserAndDateRange.mockResolvedValue([
      {
        id: "record_1",
        date: "2026-04-05",
        sleepHours: 7.2,
        weightKg: 63.1,
        waterMl: 1800,
      },
      {
        id: "record_2",
        date: "2026-04-03",
        sleepHours: null,
        weightKg: 63.4,
        waterMl: 2100,
      },
    ]);

    const { getHistoryMonthOverviewByUserId } = await import(
      "@/lib/services/history-service"
    );
    const overview = await getHistoryMonthOverviewByUserId(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
      "2026-04",
    );

    expect(getDailyRecordsByUserAndDateRange).toHaveBeenCalledWith(
      "user_1",
      "2026-04-01",
      "2026-04-30",
    );
    expect(overview.monthLabel).toBeTruthy();
    expect(overview.previousMonth).toBe("2026-03");
    expect(overview.nextMonth).toBeNull();
    expect(overview.completeDays).toBe(1);
    expect(overview.partialDays).toBe(1);
    expect(overview.emptyDays).toBe(28);
    expect(overview.rows[0]).toMatchObject({
      date: "2026-04-30",
      hasAnyRecord: false,
      isComplete: false,
    });
    expect(overview.rows.find((row) => row.date === "2026-04-05")).toMatchObject({
      sleepDisplay: "7.2",
      weightDisplay: "63.1",
      waterDisplay: "1800",
      isComplete: true,
    });
    expect(overview.calendar.find((cell) => cell.date === "2026-04-05")).toMatchObject({
      isToday: true,
      hasAnyRecord: true,
      isComplete: true,
      completedMetrics: 3,
    });
  });
});
