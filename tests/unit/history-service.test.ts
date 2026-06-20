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
    getDailyRecordsByUserAndDateRange.mockImplementation(
      async (_userId: string, fromDate: string) => {
        if (fromDate === "2026-04-01") {
          return [
            {
              id: "record_1",
              date: "2026-04-05",
              sleepHours: 7.2,
              weightKg: 63.1,
              waterMl: 1800,
              contextTags: {
                dietTags: ["LIGHT"],
                activityLevel: "NORMAL",
                energyLevel: null,
                weighTiming: "MORNING",
              },
            },
            {
              id: "record_2",
              date: "2026-04-03",
              sleepHours: null,
              weightKg: 63.4,
              waterMl: 2100,
              contextTags: {
                dietTags: ["DINING_OUT"],
                activityLevel: "LOW",
                energyLevel: null,
                weighTiming: null,
              },
            },
          ];
        }

        return [
          {
            id: "record_prev_1",
              date: "2026-03-10",
              sleepHours: 7.5,
              weightKg: 63.5,
              waterMl: 1900,
              contextTags: null,
            },
        ];
      },
    );

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

    expect(getDailyRecordsByUserAndDateRange).toHaveBeenNthCalledWith(
      1,
      "user_1",
      "2026-04-01",
      "2026-04-30",
    );
    expect(getDailyRecordsByUserAndDateRange).toHaveBeenNthCalledWith(
      2,
      "user_1",
      "2026-03-01",
      "2026-03-31",
    );
    expect(overview.monthLabel).toBeTruthy();
    expect(overview.previousMonth).toBe("2026-03");
    expect(overview.nextMonth).toBeNull();
    expect(overview.completeDays).toBe(1);
    expect(overview.partialDays).toBe(1);
    expect(overview.emptyDays).toBe(28);
    expect(overview.recordDensity).toBe(6.7);
    expect(overview.weightContextSummary).toMatchObject({
      recordedWeightDays: 2,
      taggedWeightDays: 2,
    });
    expect(overview.weightContextSummary.topContextLabels).toEqual(
      expect.arrayContaining([
        { label: "清淡", count: 1 },
        { label: "正常", count: 1 },
        { label: "晨起", count: 1 },
        { label: "外食", count: 1 },
        { label: "偏少", count: 1 },
      ]),
    );
    expect(overview.insights).toEqual([
      {
        tone: "info",
        title: "这个月和上月接近",
        description: "记录密度稳定，继续保持同样节奏。",
      },
      {
        tone: "info",
        title: "睡眠最容易漏记",
        description: "这个月有 1 天记了睡眠。先补这项，月度线会更清楚。",
      },
    ]);
    expect(overview.rows[0]).toMatchObject({
      date: "2026-04-30",
      hasAnyRecord: false,
      isComplete: false,
    });
    expect(overview.rows.find((row) => row.date === "2026-04-05")).toMatchObject({
      sleepDisplay: "7.2",
      weightDisplay: "63.1",
      weightContextLabels: ["清淡", "正常", "晨起"],
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
