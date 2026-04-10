import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import {
  deleteDailyRecordByUserAndDate,
  getDailyRecordByUserAndDate,
  getLatestMetricDefaultsByUserId,
  getRecentDailyRecordSummariesByUserId,
  upsertDailyRecordByUserId,
} from "@/lib/services/daily-record-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    dailyRecord: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("daily-record-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads one daily record by user and date", async () => {
    vi.mocked(prisma.dailyRecord.findUnique).mockResolvedValue({
      id: "record_1",
      userId: "user_1",
      date: new Date("2026-04-03T00:00:00.000Z"),
      sleepHours: new Prisma.Decimal("7.5"),
      weightKg: new Prisma.Decimal("63.20"),
      waterMl: 1800,
      isBackfilled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const record = await getDailyRecordByUserAndDate("user_1", "2026-04-03");

    expect(prisma.dailyRecord.findUnique).toHaveBeenCalledWith({
      where: {
        userId_date: {
          userId: "user_1",
          date: new Date("2026-04-03T00:00:00.000Z"),
        },
      },
    });
    expect(record).toEqual({
      id: "record_1",
      date: "2026-04-03",
      sleepHours: 7.5,
      weightKg: 63.2,
      waterMl: 1800,
      isBackfilled: false,
    });
  });

  it("upserts one daily record and serializes decimals", async () => {
    vi.mocked(prisma.dailyRecord.upsert).mockResolvedValue({
      id: "record_1",
      userId: "user_1",
      date: new Date("2026-04-03T00:00:00.000Z"),
      sleepHours: new Prisma.Decimal("6.8"),
      weightKg: new Prisma.Decimal("64.10"),
      waterMl: 2100,
      isBackfilled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const record = await upsertDailyRecordByUserId("user_1", {
      date: "2026-04-03",
      sleepHours: 6.8,
      weightKg: 64.1,
      waterMl: 2100,
    }, {
      isBackfilled: true,
    });

    expect(prisma.dailyRecord.upsert).toHaveBeenCalledWith({
      where: {
        userId_date: {
          userId: "user_1",
          date: new Date("2026-04-03T00:00:00.000Z"),
        },
      },
      create: {
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: 6.8,
        weightKg: 64.1,
        waterMl: 2100,
        isBackfilled: true,
      },
      update: {
        sleepHours: 6.8,
        weightKg: 64.1,
        waterMl: 2100,
        isBackfilled: true,
      },
    });
    expect(record.sleepHours).toBe(6.8);
    expect(record.weightKg).toBe(64.1);
    expect(record.isBackfilled).toBe(true);
  });

  it("loads records within a date range in ascending order", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "record_1",
        userId: "user_1",
        date: new Date("2026-04-01T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.1"),
        weightKg: null,
        waterMl: 1800,
        isBackfilled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "record_2",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: null,
        weightKg: new Prisma.Decimal("63.10"),
        waterMl: 2000,
        isBackfilled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const records = await import("@/lib/services/daily-record-service").then((module) =>
      module.getDailyRecordsByUserAndDateRange("user_1", "2026-04-01", "2026-04-03"),
    );

    expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        date: {
          gte: new Date("2026-04-01T00:00:00.000Z"),
          lte: new Date("2026-04-03T00:00:00.000Z"),
        },
      },
      orderBy: {
        date: "asc",
      },
    });
    expect(records).toEqual([
      {
        id: "record_1",
        date: "2026-04-01",
        sleepHours: 7.1,
        weightKg: null,
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
  });

  it("builds recent record summaries in reverse chronological order", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "record_1",
        userId: "user_1",
        date: new Date("2026-04-01T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.1"),
        weightKg: null,
        waterMl: 1800,
        isBackfilled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "record_2",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.4"),
        weightKg: new Prisma.Decimal("63.10"),
        waterMl: 2000,
        isBackfilled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const records = await getRecentDailyRecordSummariesByUserId(
      "user_1",
      "2026-04-03",
      3,
    );

    expect(records).toEqual([
      {
        date: "2026-04-03",
        completedMetrics: 3,
        hasAnyRecord: true,
        isComplete: true,
        sleepRecorded: true,
        weightRecorded: true,
        waterRecorded: true,
      },
      {
        date: "2026-04-02",
        completedMetrics: 0,
        hasAnyRecord: false,
        isComplete: false,
        sleepRecorded: false,
        weightRecorded: false,
        waterRecorded: false,
      },
      {
        date: "2026-04-01",
        completedMetrics: 2,
        hasAnyRecord: true,
        isComplete: false,
        sleepRecorded: true,
        weightRecorded: false,
        waterRecorded: true,
      },
    ]);
  });

  it("loads the latest recorded defaults for quick fill", async () => {
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        id: "record_3",
        userId: "user_1",
        date: new Date("2026-04-04T00:00:00.000Z"),
        sleepHours: null,
        weightKg: new Prisma.Decimal("63.00"),
        waterMl: null,
        isBackfilled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "record_2",
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: new Prisma.Decimal("7.2"),
        weightKg: null,
        waterMl: 2200,
        isBackfilled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const defaults = await getLatestMetricDefaultsByUserId("user_1", "2026-04-04");

    expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        date: {
          gte: new Date("2026-03-06T00:00:00.000Z"),
          lte: new Date("2026-04-04T00:00:00.000Z"),
        },
      },
      orderBy: {
        date: "desc",
      },
    });
    expect(defaults).toEqual({
      sleepHours: 7.2,
      weightKg: 63,
      waterMl: 2200,
    });
  });

  it("deletes one daily record by user and date", async () => {
    vi.mocked(prisma.dailyRecord.deleteMany).mockResolvedValue({
      count: 1,
    });

    const result = await deleteDailyRecordByUserAndDate("user_1", "2026-04-03");

    expect(prisma.dailyRecord.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
      },
    });
    expect(result).toEqual({
      deleted: true,
    });
  });
});
