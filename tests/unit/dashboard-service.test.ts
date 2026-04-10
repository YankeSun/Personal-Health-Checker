import { GoalMode, Metric, Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { getDashboardOverviewByUserId } from "@/lib/services/dashboard-service";
import { getGoalsByUserId } from "@/lib/services/goals-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    dailyRecord: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/goals-service", () => ({
  getGoalsByUserId: vi.fn(),
  getGoalByMetric: (
    goals: Array<{
      metric: Metric;
      mode: GoalMode;
      isActive: boolean;
      targetValue: number | null;
      minValue: number | null;
      maxValue: number | null;
    }>,
    metric: Metric,
  ) =>
    goals.find((goal) => goal.metric === metric) ?? {
      metric,
      mode: metric === Metric.WEIGHT ? GoalMode.IN_RANGE : GoalMode.AT_LEAST,
      isActive: false,
      targetValue: null,
      minValue: null,
      maxValue: null,
    },
}));

function buildRecord({
  id,
  date,
  sleepHours,
  weightKg,
  waterMl,
}: {
  id: string;
  date: string;
  sleepHours: number | null;
  weightKg: number | null;
  waterMl: number | null;
}) {
  return {
    id,
    userId: "user_1",
    date: new Date(`${date}T00:00:00.000Z`),
    sleepHours: sleepHours === null ? null : new Prisma.Decimal(String(sleepHours)),
    weightKg: weightKg === null ? null : new Prisma.Decimal(String(weightKg)),
    waterMl,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("dashboard-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds dashboard summary with streaks and completion rates", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "r1",
        userId: "user_1",
        date: new Date("2026-03-31T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.0"),
        weightKg: new Prisma.Decimal("62.5"),
        waterMl: 1800,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r2",
        userId: "user_1",
        date: new Date("2026-04-01T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.5"),
        weightKg: new Prisma.Decimal("62.3"),
        waterMl: 2000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r3",
        userId: "user_1",
        date: new Date("2026-04-02T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("8.0"),
        weightKg: new Prisma.Decimal("62.1"),
        waterMl: 2100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r4",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.2"),
        weightKg: new Prisma.Decimal("62.0"),
        waterMl: 1900,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(getGoalsByUserId).mockResolvedValue([
      {
        metric: Metric.SLEEP,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 7.5,
        minValue: null,
        maxValue: null,
      },
      {
        metric: Metric.WEIGHT,
        mode: GoalMode.IN_RANGE,
        isActive: true,
        targetValue: null,
        minValue: 60,
        maxValue: 63,
      },
      {
        metric: Metric.WATER,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 2000,
        minValue: null,
        maxValue: null,
      },
    ]);

    const overview = await getDashboardOverviewByUserId(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
      [7, 30],
    );

    expect(overview.todayDate).toBe("2026-04-03");
    expect(overview.streakDays).toBe(4);
    expect(overview.todayCompletedMetrics).toBe(3);
    expect(overview.insights[0]).toMatchObject({
      id: "streak-momentum",
      title: "连续记录已经到 4 天",
    });
    expect(overview.insights[1]).toMatchObject({
      id: "weekly-focus-goal",
      title: "这周最该先看的是睡眠",
    });
    expect(overview.windows[0].days).toBe(7);
    expect(overview.windows[0].completeRecordDays).toBe(4);
    expect(overview.windows[0].metrics[0]).toMatchObject({
      metric: Metric.SLEEP,
      recordedDays: 4,
      attainmentRate: 28.6,
      latestDisplay: "7.2",
    });
    expect(overview.todayMetrics[1]).toMatchObject({
      metric: Metric.WEIGHT,
      goalMet: true,
      displayValue: "62",
    });
  });

  it("returns zero streak when today's record is incomplete", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "r1",
        userId: "user_1",
        date: new Date("2026-04-02T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("8"),
        weightKg: new Prisma.Decimal("62.1"),
        waterMl: 2100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r2",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7"),
        weightKg: null,
        waterMl: 1600,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(getGoalsByUserId).mockResolvedValue([]);

    const overview = await getDashboardOverviewByUserId(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
      [7],
    );

    expect(overview.streakDays).toBe(0);
    expect(overview.todayCompletedMetrics).toBe(2);
    expect(overview.insights[0]).toMatchObject({
      id: "today-focus",
      title: "今天先补体重",
    });
    expect(overview.windows[0].completionRate).toBe(14.3);
  });

  it("includes comparison data against the previous matching window", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      buildRecord({
        id: "r1",
        date: "2026-03-28",
        sleepHours: 7,
        weightKg: 63.2,
        waterMl: 1600,
      }),
      buildRecord({
        id: "r2",
        date: "2026-03-29",
        sleepHours: 7.1,
        weightKg: 63.1,
        waterMl: 1700,
      }),
      buildRecord({
        id: "r3",
        date: "2026-03-30",
        sleepHours: 7.3,
        weightKg: 62.9,
        waterMl: 1900,
      }),
      buildRecord({
        id: "r4",
        date: "2026-03-31",
        sleepHours: 7.5,
        weightKg: 62.7,
        waterMl: 2000,
      }),
      buildRecord({
        id: "r5",
        date: "2026-04-01",
        sleepHours: 7.7,
        weightKg: 62.5,
        waterMl: 2100,
      }),
      buildRecord({
        id: "r6",
        date: "2026-04-02",
        sleepHours: 7.8,
        weightKg: 62.3,
        waterMl: 2200,
      }),
      buildRecord({
        id: "r7",
        date: "2026-04-03",
        sleepHours: 7.9,
        weightKg: 62.1,
        waterMl: 2300,
      }),
      buildRecord({
        id: "r8",
        date: "2026-03-21",
        sleepHours: 6.6,
        weightKg: 63.8,
        waterMl: 1400,
      }),
      buildRecord({
        id: "r9",
        date: "2026-03-22",
        sleepHours: 6.7,
        weightKg: 63.6,
        waterMl: 1450,
      }),
      buildRecord({
        id: "r10",
        date: "2026-03-23",
        sleepHours: 6.8,
        weightKg: 63.5,
        waterMl: 1500,
      }),
      buildRecord({
        id: "r11",
        date: "2026-03-24",
        sleepHours: 6.9,
        weightKg: 63.4,
        waterMl: 1500,
      }),
      buildRecord({
        id: "r12",
        date: "2026-03-25",
        sleepHours: 6.9,
        weightKg: 63.3,
        waterMl: 1550,
      }),
      buildRecord({
        id: "r13",
        date: "2026-03-26",
        sleepHours: 7,
        weightKg: 63.2,
        waterMl: 1600,
      }),
      buildRecord({
        id: "r14",
        date: "2026-03-27",
        sleepHours: 7,
        weightKg: 63.1,
        waterMl: 1650,
      }),
    ]);
    vi.mocked(getGoalsByUserId).mockResolvedValue([
      {
        metric: Metric.SLEEP,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 7.5,
        minValue: null,
        maxValue: null,
      },
      {
        metric: Metric.WEIGHT,
        mode: GoalMode.IN_RANGE,
        isActive: true,
        targetValue: null,
        minValue: 60,
        maxValue: 63,
      },
      {
        metric: Metric.WATER,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 2000,
        minValue: null,
        maxValue: null,
      },
    ]);

    const overview = await getDashboardOverviewByUserId(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
      [7],
    );

    expect(overview.windows[0].comparison).toMatchObject({
      previousStartDate: "2026-03-21",
      previousEndDate: "2026-03-27",
      previousCompletionRate: 100,
      completionRateChange: 0,
    });
    expect(overview.windows[0].comparison.metrics[0]).toMatchObject({
      metric: Metric.SLEEP,
      currentAverageDisplay: "7.5",
      previousAverageDisplay: "6.8",
      averageDeltaDisplay: "+0.6",
      averageDeltaDirection: "up",
      attainmentRateChange: 57.1,
    });
    expect(overview.windows[0].comparison.metrics[1]).toMatchObject({
      metric: Metric.WEIGHT,
      averageDeltaDisplay: "-0.7",
      averageDeltaDirection: "down",
    });
  });
});
