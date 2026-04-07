import { WaterUnit, WeightUnit } from "@prisma/client";

import { getDailyRecordsByUserAndDateRange } from "@/lib/services/daily-record-service";
import { getDateRange, getDateStringInTimezone } from "@/lib/utils/dates";
import { toDisplaySleep, toDisplayWater, toDisplayWeight } from "@/lib/utils/units";

type RecordHistoryProfile = {
  timezone: string;
  weightUnit: WeightUnit;
  waterUnit: WaterUnit;
};

export type RecordHistoryRow = {
  date: string;
  sleepDisplay: string | null;
  weightDisplay: string | null;
  waterDisplay: string | null;
  weightUnitLabel: string;
  waterUnitLabel: string;
  completedMetrics: number;
  hasAnyRecord: boolean;
  isComplete: boolean;
};

export type RecordHistoryWindow = {
  startDate: string;
  endDate: string;
  days: 7 | 30;
  rows: RecordHistoryRow[];
  completeDays: number;
  partialDays: number;
  emptyDays: number;
};

function getCompletedMetrics(row: {
  sleepDisplay: string | null;
  weightDisplay: string | null;
  waterDisplay: string | null;
}) {
  return [row.sleepDisplay, row.weightDisplay, row.waterDisplay].filter(
    (value) => value !== null,
  ).length;
}

export async function getRecordHistoryWindowByUserId(
  userId: string,
  profile: RecordHistoryProfile,
  days: 7 | 30,
) {
  const endDate = getDateStringInTimezone(profile.timezone);
  const dates = getDateRange(endDate, days);
  const records = await getDailyRecordsByUserAndDateRange(
    userId,
    dates[0],
    dates[dates.length - 1],
  );
  const recordMap = new Map(records.map((record) => [record.date, record]));
  const weightUnitLabel = profile.weightUnit === WeightUnit.KG ? "kg" : "lb";
  const waterUnitLabel = profile.waterUnit === WaterUnit.ML ? "ml" : "oz";

  const rows = [...dates].reverse().map((date) => {
    const record = recordMap.get(date) ?? null;
    const row = {
      date,
      sleepDisplay: record?.sleepHours == null ? null : toDisplaySleep(record.sleepHours),
      weightDisplay:
        record?.weightKg == null
          ? null
          : toDisplayWeight(record.weightKg, profile.weightUnit),
      waterDisplay:
        record?.waterMl == null
          ? null
          : toDisplayWater(record.waterMl, profile.waterUnit),
      weightUnitLabel,
      waterUnitLabel,
      completedMetrics: 0,
      hasAnyRecord: false,
      isComplete: false,
    } satisfies RecordHistoryRow;

    const completedMetrics = getCompletedMetrics(row);

    return {
      ...row,
      completedMetrics,
      hasAnyRecord: completedMetrics > 0,
      isComplete: completedMetrics === 3,
    } satisfies RecordHistoryRow;
  });

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    days,
    rows,
    completeDays: rows.filter((row) => row.isComplete).length,
    partialDays: rows.filter((row) => row.hasAnyRecord && !row.isComplete).length,
    emptyDays: rows.filter((row) => !row.hasAnyRecord).length,
  } satisfies RecordHistoryWindow;
}
