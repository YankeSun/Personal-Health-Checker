import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { DailyRecordInput } from "@/lib/validations/daily-record";
import {
  dateStringToStorageDate,
  getDateRange,
  getDateStringInTimezone,
  shiftDateString,
  storageDateToDateString,
} from "@/lib/utils/dates";

export type DailyRecordView = {
  id: string;
  date: string;
  sleepHours: number | null;
  weightKg: number | null;
  waterMl: number | null;
  isBackfilled: boolean;
};

export type DailyRecordSummaryView = {
  date: string;
  completedMetrics: number;
  hasAnyRecord: boolean;
  isComplete: boolean;
  sleepRecorded: boolean;
  weightRecorded: boolean;
  waterRecorded: boolean;
};

export type LatestMetricDefaultsView = {
  sleepHours: number | null;
  weightKg: number | null;
  waterMl: number | null;
};

export type DailyRecordMilestonesView = {
  hasAnyRecord: boolean;
  hasCompleteRecord: boolean;
};

function getCompletedMetricCount(record: Pick<
  DailyRecordView,
  "sleepHours" | "weightKg" | "waterMl"
>) {
  return [record.sleepHours, record.weightKg, record.waterMl].filter(
    (value) => value !== null,
  ).length;
}

function serializeDailyRecord(record: {
  id: string;
  date: Date;
  sleepHours: Prisma.Decimal | number | null;
  weightKg: Prisma.Decimal | number | null;
  waterMl: number | null;
  isBackfilled: boolean;
}) {
  return {
    id: record.id,
    date: storageDateToDateString(record.date),
    sleepHours: record.sleepHours === null ? null : Number(record.sleepHours),
    weightKg: record.weightKg === null ? null : Number(record.weightKg),
    waterMl: record.waterMl,
    isBackfilled: record.isBackfilled,
  } satisfies DailyRecordView;
}

export async function getDailyRecordByUserAndDate(
  userId: string,
  dateString: string,
) {
  const record = await prisma.dailyRecord.findUnique({
    where: {
      userId_date: {
        userId,
        date: dateStringToStorageDate(dateString),
      },
    },
  });

  if (!record) {
    return null;
  }

  return serializeDailyRecord(record);
}

export async function getTodayRecordByUserId(
  userId: string,
  timezone: string,
) {
  const today = getDateStringInTimezone(timezone);
  return getDailyRecordByUserAndDate(userId, today);
}

export async function getDailyRecordsByUserAndDateRange(
  userId: string,
  fromDate: string,
  toDate: string,
) {
  const records = await prisma.dailyRecord.findMany({
    where: {
      userId,
      date: {
        gte: dateStringToStorageDate(fromDate),
        lte: dateStringToStorageDate(toDate),
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return records.map((record) => serializeDailyRecord(record));
}

export async function getRecentDailyRecordSummariesByUserId(
  userId: string,
  endDate: string,
  days: number,
) {
  const dates = getDateRange(endDate, days);
  const records = await getDailyRecordsByUserAndDateRange(
    userId,
    dates[0],
    dates[dates.length - 1],
  );
  const recordMap = new Map(records.map((record) => [record.date, record]));

  return [...dates].reverse().map((date) => {
    const record = recordMap.get(date) ?? null;
    const completedMetrics = record ? getCompletedMetricCount(record) : 0;

    return {
      date,
      completedMetrics,
      hasAnyRecord: completedMetrics > 0,
      isComplete: completedMetrics === 3,
      sleepRecorded: record?.sleepHours != null,
      weightRecorded: record?.weightKg != null,
      waterRecorded: record?.waterMl != null,
    } satisfies DailyRecordSummaryView;
  });
}

export async function getLatestMetricDefaultsByUserId(
  userId: string,
  endDate: string,
  lookbackDays = 30,
) {
  const startDate = shiftDateString(endDate, -(lookbackDays - 1));
  const records = await prisma.dailyRecord.findMany({
    where: {
      userId,
      date: {
        gte: dateStringToStorageDate(startDate),
        lte: dateStringToStorageDate(endDate),
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  const defaults: LatestMetricDefaultsView = {
    sleepHours: null,
    weightKg: null,
    waterMl: null,
  };

  for (const record of records) {
    if (defaults.sleepHours === null && record.sleepHours !== null) {
      defaults.sleepHours = Number(record.sleepHours);
    }

    if (defaults.weightKg === null && record.weightKg !== null) {
      defaults.weightKg = Number(record.weightKg);
    }

    if (defaults.waterMl === null && record.waterMl !== null) {
      defaults.waterMl = record.waterMl;
    }

    if (
      defaults.sleepHours !== null &&
      defaults.weightKg !== null &&
      defaults.waterMl !== null
    ) {
      break;
    }
  }

  return defaults;
}

export async function getDailyRecordMilestonesByUserId(
  userId: string,
): Promise<DailyRecordMilestonesView> {
  const [anyRecord, completeRecord] = await Promise.all([
    prisma.dailyRecord.findFirst({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    }),
    prisma.dailyRecord.findFirst({
      where: {
        userId,
        sleepHours: {
          not: null,
        },
        weightKg: {
          not: null,
        },
        waterMl: {
          not: null,
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  return {
    hasAnyRecord: Boolean(anyRecord),
    hasCompleteRecord: Boolean(completeRecord),
  };
}

export async function upsertDailyRecordByUserId(
  userId: string,
  input: DailyRecordInput,
  options?: {
    isBackfilled?: boolean;
  },
) {
  const record = await prisma.dailyRecord.upsert({
    where: {
      userId_date: {
        userId,
        date: dateStringToStorageDate(input.date),
      },
    },
    create: {
      userId,
      date: dateStringToStorageDate(input.date),
      sleepHours: input.sleepHours,
      weightKg: input.weightKg,
      waterMl: input.waterMl,
      isBackfilled: options?.isBackfilled ?? false,
    },
    update: {
      sleepHours: input.sleepHours,
      weightKg: input.weightKg,
      waterMl: input.waterMl,
      isBackfilled: options?.isBackfilled ?? false,
    },
  });

  return serializeDailyRecord(record);
}

export async function deleteDailyRecordByUserAndDate(
  userId: string,
  dateString: string,
) {
  const result = await prisma.dailyRecord.deleteMany({
    where: {
      userId,
      date: dateStringToStorageDate(dateString),
    },
  });

  return {
    deleted: result.count > 0,
  };
}
