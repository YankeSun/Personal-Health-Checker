import { WaterUnit, WeightUnit } from "@prisma/client";

import { getDailyRecordsByUserAndDateRange } from "@/lib/services/daily-record-service";
import {
  formatDateLabel,
  formatMonthLabel,
  getMonthBounds,
  getMonthCalendarGrid,
  getMonthDates,
  getMonthStringInTimezone,
  getDateStringInTimezone,
  shiftMonthString,
} from "@/lib/utils/dates";
import { toDisplaySleep, toDisplayWater, toDisplayWeight } from "@/lib/utils/units";
import { MAX_HISTORY_MONTHS } from "@/lib/validations/history";

type HistoryProfile = {
  timezone: string;
  weightUnit: WeightUnit;
  waterUnit: WaterUnit;
};

export type HistoryCalendarCell = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasAnyRecord: boolean;
  isComplete: boolean;
  completedMetrics: number;
};

export type HistoryDayRow = {
  date: string;
  label: string;
  sleepDisplay: string | null;
  weightDisplay: string | null;
  waterDisplay: string | null;
  weightUnitLabel: string;
  waterUnitLabel: string;
  completedMetrics: number;
  hasAnyRecord: boolean;
  isComplete: boolean;
};

export type HistoryMonthOverview = {
  month: string;
  monthLabel: string;
  startDate: string;
  endDate: string;
  previousMonth: string | null;
  nextMonth: string | null;
  completeDays: number;
  partialDays: number;
  emptyDays: number;
  calendar: HistoryCalendarCell[];
  rows: HistoryDayRow[];
};

function getCompletedMetrics(record: {
  sleepHours: number | null;
  weightKg: number | null;
  waterMl: number | null;
} | null) {
  if (!record) {
    return 0;
  }

  return [record.sleepHours, record.weightKg, record.waterMl].filter(
    (value) => value !== null,
  ).length;
}

export async function getHistoryMonthOverviewByUserId(
  userId: string,
  profile: HistoryProfile,
  month: string,
) {
  const currentMonth = getMonthStringInTimezone(profile.timezone);
  const minMonth = shiftMonthString(currentMonth, -(MAX_HISTORY_MONTHS - 1));
  const { startDate, endDate } = getMonthBounds(month);
  const records = await getDailyRecordsByUserAndDateRange(userId, startDate, endDate);
  const recordMap = new Map(records.map((record) => [record.date, record]));
  const calendarDates = getMonthCalendarGrid(month);
  const monthDates = getMonthDates(month);
  const weightUnitLabel = profile.weightUnit === WeightUnit.KG ? "kg" : "lb";
  const waterUnitLabel = profile.waterUnit === WaterUnit.ML ? "ml" : "oz";
  const todayDate = getDateStringInTimezone(profile.timezone);

  const rows = [...monthDates]
    .reverse()
    .map((date) => {
      const record = recordMap.get(date) ?? null;
      const completedMetrics = getCompletedMetrics(record);

      return {
        date,
        label: formatDateLabel(date),
        sleepDisplay: record?.sleepHours === null || record?.sleepHours == null ? null : toDisplaySleep(record.sleepHours),
        weightDisplay:
          record?.weightKg === null || record?.weightKg == null
            ? null
            : toDisplayWeight(record.weightKg, profile.weightUnit),
        waterDisplay:
          record?.waterMl === null || record?.waterMl == null
            ? null
            : toDisplayWater(record.waterMl, profile.waterUnit),
        weightUnitLabel,
        waterUnitLabel,
        completedMetrics,
        hasAnyRecord: completedMetrics > 0,
        isComplete: completedMetrics === 3,
      } satisfies HistoryDayRow;
    });

  const calendar = calendarDates.map((date) => {
    const record = recordMap.get(date) ?? null;
    const completedMetrics = getCompletedMetrics(record);

    return {
      date,
      dayNumber: Number(date.slice(-2)),
      inCurrentMonth: date.startsWith(month),
      isToday: date === todayDate,
      hasAnyRecord: completedMetrics > 0,
      isComplete: completedMetrics === 3,
      completedMetrics,
    } satisfies HistoryCalendarCell;
  });

  return {
    month,
    monthLabel: formatMonthLabel(month),
    startDate,
    endDate,
    previousMonth: month > minMonth ? shiftMonthString(month, -1) : null,
    nextMonth: month < currentMonth ? shiftMonthString(month, 1) : null,
    completeDays: rows.filter((row) => row.isComplete).length,
    partialDays: rows.filter((row) => row.hasAnyRecord && !row.isComplete).length,
    emptyDays: rows.filter((row) => !row.hasAnyRecord).length,
    calendar,
    rows,
  } satisfies HistoryMonthOverview;
}
