import { GoalMode, Metric, Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { getGoalsByUserId } from "@/lib/services/goals-service";
import { getReminderFeedByUserId } from "@/lib/services/reminder-service";

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

describe("reminder-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds missing-record and low-attainment reminders", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "r1",
        userId: "user_1",
        date: new Date("2026-03-29T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.4"),
        weightKg: new Prisma.Decimal("62.4"),
        waterMl: 1500,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r2",
        userId: "user_1",
        date: new Date("2026-03-31T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.8"),
        weightKg: new Prisma.Decimal("62.2"),
        waterMl: 1700,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r3",
        userId: "user_1",
        date: new Date("2026-04-02T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.1"),
        weightKg: new Prisma.Decimal("62.0"),
        waterMl: 1600,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r4",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.3"),
        weightKg: new Prisma.Decimal("61.9"),
        waterMl: null,
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

    const feed = await getReminderFeedByUserId("user_1", {
      timezone: "Asia/Shanghai",
      reminderEnabled: true,
      weightUnit: "KG",
      waterUnit: "ML",
    });

    expect(feed.enabled).toBe(true);
    expect(feed.reminders[0]).toMatchObject({
      id: "missing-some-today",
      title: "今天还有 1 项待补录",
    });
    expect(feed.reminders.some((reminder) => reminder.title.includes("饮水达标率偏低"))).toBe(true);
  });

  it("returns no reminders when in-app reminders are disabled", async () => {
    const feed = await getReminderFeedByUserId("user_1", {
      timezone: "Asia/Shanghai",
      reminderEnabled: false,
      weightUnit: "KG",
      waterUnit: "ML",
    });

    expect(feed).toEqual({
      enabled: false,
      todayDate: "2026-04-03",
      reminders: [],
    });
    expect(prisma.dailyRecord.findMany).not.toHaveBeenCalled();
  });

  it("returns a positive reminder for a healthy complete streak", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "r1",
        userId: "user_1",
        date: new Date("2026-04-01T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.8"),
        weightKg: new Prisma.Decimal("62.2"),
        waterMl: 2100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r2",
        userId: "user_1",
        date: new Date("2026-04-02T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.9"),
        weightKg: new Prisma.Decimal("62.0"),
        waterMl: 2200,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "r3",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("8.0"),
        weightKg: new Prisma.Decimal("61.9"),
        waterMl: 2300,
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

    const feed = await getReminderFeedByUserId("user_1", {
      timezone: "Asia/Shanghai",
      reminderEnabled: true,
      weightUnit: "KG",
      waterUnit: "ML",
    });

    expect(feed.reminders.some((reminder) => reminder.id === "consistency-streak")).toBe(true);
  });

  it("adds a reminder when one metric has been missing for multiple consecutive days", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      buildRecord({
        id: "r1",
        date: "2026-03-31",
        sleepHours: 7.4,
        weightKg: 62.1,
        waterMl: 1800,
      }),
      buildRecord({
        id: "r2",
        date: "2026-04-01",
        sleepHours: 7.2,
        weightKg: 62.0,
        waterMl: 1750,
      }),
      buildRecord({
        id: "r3",
        date: "2026-04-02",
        sleepHours: 7.3,
        weightKg: 61.9,
        waterMl: null,
      }),
      buildRecord({
        id: "r4",
        date: "2026-04-03",
        sleepHours: 7.1,
        weightKg: 61.8,
        waterMl: null,
      }),
    ]);
    vi.mocked(getGoalsByUserId).mockResolvedValue([
      {
        metric: Metric.SLEEP,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 7,
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
        targetValue: 1800,
        minValue: null,
        maxValue: null,
      },
    ]);

    const feed = await getReminderFeedByUserId("user_1", {
      timezone: "Asia/Shanghai",
      reminderEnabled: true,
      weightUnit: "KG",
      waterUnit: "ML",
    });

    expect(feed.reminders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "missing-streak-water",
          title: "饮水已经连续 2 天没有记录",
          actionHref: "/today",
        }),
      ]),
    );
  });

  it("adds a reminder when an active goal has been missed for multiple consecutive days", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      buildRecord({
        id: "r1",
        date: "2026-03-28",
        sleepHours: 8,
        weightKg: 62.4,
        waterMl: 2200,
      }),
      buildRecord({
        id: "r2",
        date: "2026-03-29",
        sleepHours: 8,
        weightKg: 62.3,
        waterMl: 2200,
      }),
      buildRecord({
        id: "r3",
        date: "2026-03-30",
        sleepHours: 8,
        weightKg: 62.2,
        waterMl: 2200,
      }),
      buildRecord({
        id: "r4",
        date: "2026-03-31",
        sleepHours: 8,
        weightKg: 62.1,
        waterMl: 2200,
      }),
      buildRecord({
        id: "r5",
        date: "2026-04-01",
        sleepHours: 6.8,
        weightKg: 62.0,
        waterMl: 2200,
      }),
      buildRecord({
        id: "r6",
        date: "2026-04-02",
        sleepHours: 6.7,
        weightKg: 61.9,
        waterMl: 2200,
      }),
      buildRecord({
        id: "r7",
        date: "2026-04-03",
        sleepHours: 6.9,
        weightKg: 61.8,
        waterMl: 2200,
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

    const feed = await getReminderFeedByUserId("user_1", {
      timezone: "Asia/Shanghai",
      reminderEnabled: true,
      weightUnit: "KG",
      waterUnit: "ML",
    });

    expect(feed.reminders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "goal-miss-streak-sleep",
          title: "睡眠已经连续 3 天未达标",
          actionHref: "/trends?metric=sleep&days=7",
        }),
      ]),
    );
  });

  it("adds a weekly highpoint reminder when there is strong recent consistency", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      buildRecord({
        id: "r1",
        date: "2026-03-28",
        sleepHours: 7.4,
        weightKg: 62.3,
        waterMl: 2100,
      }),
      buildRecord({
        id: "r2",
        date: "2026-03-29",
        sleepHours: 7.5,
        weightKg: 62.2,
        waterMl: 2100,
      }),
      buildRecord({
        id: "r3",
        date: "2026-03-30",
        sleepHours: 7.5,
        weightKg: 62.1,
        waterMl: 2100,
      }),
      buildRecord({
        id: "r4",
        date: "2026-03-31",
        sleepHours: 7.6,
        weightKg: 62.0,
        waterMl: 2100,
      }),
      buildRecord({
        id: "r5",
        date: "2026-04-01",
        sleepHours: 7.5,
        weightKg: 61.9,
        waterMl: 2100,
      }),
      buildRecord({
        id: "r6",
        date: "2026-04-02",
        sleepHours: 7.4,
        weightKg: 61.8,
        waterMl: 1900,
      }),
      buildRecord({
        id: "r7",
        date: "2026-04-03",
        sleepHours: 7.6,
        weightKg: 61.7,
        waterMl: 2100,
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

    const feed = await getReminderFeedByUserId("user_1", {
      timezone: "Asia/Shanghai",
      reminderEnabled: true,
      weightUnit: "KG",
      waterUnit: "ML",
    });

    expect(feed.reminders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "weekly-highpoint-weight",
          title: "最近 7 天最稳定的是体重",
        }),
        expect.objectContaining({
          id: "consistency-streak",
        }),
      ]),
    );
  });
});
