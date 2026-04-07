import { GoalMode, Metric, Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { getGoalsByUserId } from "@/lib/services/goals-service";
import { getTrendOverviewByUserId } from "@/lib/services/trends-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    dailyRecord: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/goals-service", () => ({
  getGoalsByUserId: vi.fn(),
  getGoalByMetric: (goals: Array<{ metric: Metric }>, metric: Metric) =>
    goals.find((goal) => goal.metric === metric) ?? {
      metric,
      mode: metric === Metric.WEIGHT ? GoalMode.IN_RANGE : GoalMode.AT_LEAST,
      isActive: false,
      targetValue: null,
      minValue: null,
      maxValue: null,
    },
}));

describe("trends-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds trend data for the selected metric", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "r1",
        userId: "user_1",
        date: new Date("2026-03-30T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.0"),
        weightKg: new Prisma.Decimal("62.0"),
        waterMl: 1800,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r2",
        userId: "user_1",
        date: new Date("2026-04-01T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.6"),
        weightKg: new Prisma.Decimal("61.8"),
        waterMl: 2000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r3",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("8.2"),
        weightKg: new Prisma.Decimal("61.7"),
        waterMl: 2200,
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
    ]);

    const trend = await getTrendOverviewByUserId(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
      "sleep",
      7,
    );

    expect(trend.metric).toBe("sleep");
    expect(trend.recordedDays).toBe(3);
    expect(trend.completionRate).toBe(42.9);
    expect(trend.attainmentRate).toBe(28.6);
    expect(trend.latestDisplay).toBe("8.2");
    expect(trend.averageDisplay).toBe("7.6");
    expect(trend.points).toHaveLength(7);
    expect(trend.points[0].label).toBeDefined();
  });

  it("converts weight trend to the configured display unit", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "r1",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: null,
        weightKg: new Prisma.Decimal("63.5"),
        waterMl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(getGoalsByUserId).mockResolvedValue([]);

    const trend = await getTrendOverviewByUserId(
      "user_1",
      {
        timezone: "Asia/Shanghai",
        weightUnit: "LB",
        waterUnit: "ML",
      },
      "weight",
      7,
    );

    expect(trend.unitLabel).toBe("lb");
    expect(trend.latestDisplay).toBe("140");
    expect(trend.points[6].value).toBe(140);
  });
});
