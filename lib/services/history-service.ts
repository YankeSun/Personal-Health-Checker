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
  recordDensity: number;
  insights: HistoryMonthlyInsight[];
  calendar: HistoryCalendarCell[];
  rows: HistoryDayRow[];
};

export type HistoryMonthlyInsight = {
  tone: "success" | "info" | "warning";
  title: string;
  description: string;
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

function roundTo(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getRecordedMetricDays(
  records: Array<{
    sleepHours: number | null;
    weightKg: number | null;
    waterMl: number | null;
  }>,
) {
  return {
    sleep: records.filter((record) => record.sleepHours !== null).length,
    weight: records.filter((record) => record.weightKg !== null).length,
    water: records.filter((record) => record.waterMl !== null).length,
  };
}

function buildHistoryInsights({
  currentRecordDays,
  currentTotalDays,
  previousRecordDays,
  previousTotalDays,
  currentMetricDays,
}: {
  currentRecordDays: number;
  currentTotalDays: number;
  previousRecordDays: number | null;
  previousTotalDays: number | null;
  currentMetricDays: ReturnType<typeof getRecordedMetricDays>;
}) {
  const insights: HistoryMonthlyInsight[] = [];
  const currentDensity = roundTo((currentRecordDays / currentTotalDays) * 100);

  if (previousRecordDays !== null && previousTotalDays !== null) {
    const previousDensity = roundTo((previousRecordDays / previousTotalDays) * 100);
    const densityDelta = roundTo(currentDensity - previousDensity);

    if (densityDelta >= 10) {
      insights.push({
        tone: "success",
        title: "这个月回来得更稳定了",
        description: `有记录的天数占比比上个月高了 ${densityDelta} 个百分点。`,
      });
    } else if (densityDelta <= -10) {
      insights.push({
        tone: "warning",
        title: "这个月的记录节奏放慢了",
        description: `有记录的天数占比比上个月低了 ${Math.abs(densityDelta)} 个百分点，可以先补最容易漏掉的那一项。`,
      });
    } else {
      insights.push({
        tone: "info",
        title: "这个月的回看节奏和上月接近",
        description: "记录密度整体比较稳定，适合继续保持同样的记录频率。",
      });
    }
  }

  const metricEntries = [
    { key: "sleep", label: "睡眠", count: currentMetricDays.sleep },
    { key: "weight", label: "体重", count: currentMetricDays.weight },
    { key: "water", label: "饮水", count: currentMetricDays.water },
  ] as const;
  const counts = metricEntries.map((entry) => entry.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  const weakestMetric = metricEntries.find((entry) => entry.count === minCount);

  if (weakestMetric) {
    if (minCount === maxCount) {
      insights.push({
        tone: "success",
        title: "三项记录比较均衡",
        description: "睡眠、体重、饮水的记录天数接近，回看时更容易对照同一段时间的变化。",
      });
    } else {
      insights.push({
        tone: "info",
        title: `${weakestMetric.label}最容易漏记`,
        description: `这个月只有 ${weakestMetric.count} 天记了${weakestMetric.label}，先把这项补齐，月度变化会更容易看清。`,
      });
    }
  }

  return insights;
}

export async function getHistoryMonthOverviewByUserId(
  userId: string,
  profile: HistoryProfile,
  month: string,
) {
  const currentMonth = getMonthStringInTimezone(profile.timezone);
  const minMonth = shiftMonthString(currentMonth, -(MAX_HISTORY_MONTHS - 1));
  const { startDate, endDate } = getMonthBounds(month);
  const previousMonth = month > minMonth ? shiftMonthString(month, -1) : null;
  const previousBounds = previousMonth ? getMonthBounds(previousMonth) : null;
  const [records, previousMonthRecords] = await Promise.all([
    getDailyRecordsByUserAndDateRange(userId, startDate, endDate),
    previousBounds
      ? getDailyRecordsByUserAndDateRange(
          userId,
          previousBounds.startDate,
          previousBounds.endDate,
        )
      : Promise.resolve([]),
  ]);
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
  const recordDays = rows.filter((row) => row.hasAnyRecord).length;
  const completeDays = rows.filter((row) => row.isComplete).length;
  const partialDays = rows.filter((row) => row.hasAnyRecord && !row.isComplete).length;
  const emptyDays = rows.filter((row) => !row.hasAnyRecord).length;
  const recordDensity = roundTo((recordDays / rows.length) * 100);
  const insights = buildHistoryInsights({
    currentRecordDays: recordDays,
    currentTotalDays: monthDates.length,
    previousRecordDays: previousBounds ? previousMonthRecords.filter((record) => getCompletedMetrics(record) > 0).length : null,
    previousTotalDays: previousBounds ? getMonthDates(previousMonth!).length : null,
    currentMetricDays: getRecordedMetricDays(records),
  });

  return {
    month,
    monthLabel: formatMonthLabel(month),
    startDate,
    endDate,
    previousMonth,
    nextMonth: month < currentMonth ? shiftMonthString(month, 1) : null,
    completeDays,
    partialDays,
    emptyDays,
    recordDensity,
    insights,
    calendar,
    rows,
  } satisfies HistoryMonthOverview;
}
