import { GoalMode, Metric, WaterUnit, WeightUnit } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getGoalByMetric, getGoalsByUserId } from "@/lib/services/goals-service";
import {
  dateStringToStorageDate,
  formatShortDateLabel,
  getDateRange,
  getDateStringInTimezone,
} from "@/lib/utils/dates";
import { GoalView } from "@/lib/utils/goals";
import {
  toDisplaySleep,
  toDisplaySleepValue,
  toDisplayWater,
  toDisplayWaterValue,
  toDisplayWeight,
  toDisplayWeightValue,
} from "@/lib/utils/units";
import { TrendMetricParam } from "@/lib/validations/trends";

type SupportedTrendWindow = 7 | 30;

type TrendProfile = {
  timezone: string;
  weightUnit: WeightUnit;
  waterUnit: WaterUnit;
};

export type TrendPoint = {
  date: string;
  label: string;
  value: number | null;
  goalTarget: number | null;
  goalMin: number | null;
  goalMax: number | null;
};

export type TrendOverview = {
  metric: TrendMetricParam;
  metricLabel: string;
  unitLabel: string;
  days: SupportedTrendWindow;
  startDate: string;
  endDate: string;
  recordedDays: number;
  completionRate: number;
  attainmentRate: number | null;
  averageDisplay: string | null;
  latestDisplay: string | null;
  minDisplay: string | null;
  maxDisplay: string | null;
  goalDescription: string | null;
  points: TrendPoint[];
};

const metricMap: Record<TrendMetricParam, Metric> = {
  sleep: Metric.SLEEP,
  weight: Metric.WEIGHT,
  water: Metric.WATER,
};

const metricLabels: Record<TrendMetricParam, string> = {
  sleep: "睡眠",
  weight: "体重",
  water: "饮水",
};

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getMetricRawValue(
  metric: Metric,
  record: {
    sleepHours: number | null;
    weightKg: number | null;
    waterMl: number | null;
  } | null,
) {
  if (!record) {
    return null;
  }

  if (metric === Metric.SLEEP) {
    return record.sleepHours;
  }

  if (metric === Metric.WEIGHT) {
    return record.weightKg;
  }

  return record.waterMl;
}

function getMetricDisplayValue(
  metric: Metric,
  rawValue: number | null,
  profile: TrendProfile,
) {
  if (rawValue === null) {
    return null;
  }

  if (metric === Metric.SLEEP) {
    return toDisplaySleepValue(rawValue);
  }

  if (metric === Metric.WEIGHT) {
    return toDisplayWeightValue(rawValue, profile.weightUnit);
  }

  return toDisplayWaterValue(rawValue, profile.waterUnit);
}

function formatMetricDisplay(
  metric: Metric,
  rawValue: number | null,
  profile: TrendProfile,
) {
  if (rawValue === null) {
    return null;
  }

  if (metric === Metric.SLEEP) {
    return toDisplaySleep(rawValue);
  }

  if (metric === Metric.WEIGHT) {
    return toDisplayWeight(rawValue, profile.weightUnit);
  }

  return toDisplayWater(rawValue, profile.waterUnit);
}

function getMetricUnitLabel(metric: Metric, profile: TrendProfile) {
  if (metric === Metric.SLEEP) {
    return "小时";
  }

  if (metric === Metric.WEIGHT) {
    return profile.weightUnit === WeightUnit.KG ? "kg" : "lb";
  }

  return profile.waterUnit === WaterUnit.ML ? "ml" : "oz";
}

function evaluateGoal(value: number | null, goal: GoalView) {
  if (!goal.isActive || value === null) {
    return null;
  }

  if (goal.mode === GoalMode.IN_RANGE) {
    if (goal.minValue === null || goal.maxValue === null) {
      return null;
    }

    return value >= goal.minValue && value <= goal.maxValue;
  }

  if (goal.targetValue === null) {
    return null;
  }

  if (goal.mode === GoalMode.AT_MOST) {
    return value <= goal.targetValue;
  }

  return value >= goal.targetValue;
}

function formatGoalDescription(
  metric: Metric,
  goal: GoalView,
  profile: TrendProfile,
) {
  if (!goal.isActive) {
    return null;
  }

  const unitLabel = getMetricUnitLabel(metric, profile);

  if (goal.mode === GoalMode.IN_RANGE) {
    return `${formatMetricDisplay(metric, goal.minValue, profile)} - ${formatMetricDisplay(
      metric,
      goal.maxValue,
      profile,
    )} ${unitLabel}`;
  }

  if (goal.mode === GoalMode.AT_MOST) {
    return `不超过 ${formatMetricDisplay(metric, goal.targetValue, profile)} ${unitLabel}`;
  }

  return `至少 ${formatMetricDisplay(metric, goal.targetValue, profile)} ${unitLabel}`;
}

function getGoalLineValue(
  metric: Metric,
  rawValue: number | null,
  profile: TrendProfile,
) {
  return getMetricDisplayValue(metric, rawValue, profile);
}

export async function getTrendOverviewByUserId(
  userId: string,
  profile: TrendProfile,
  metricParam: TrendMetricParam,
  days: SupportedTrendWindow,
) {
  const metric = metricMap[metricParam];
  const todayDate = getDateStringInTimezone(profile.timezone);
  const dates = getDateRange(todayDate, days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const [records, goals] = await Promise.all([
    prisma.dailyRecord.findMany({
      where: {
        userId,
        date: {
          gte: dateStringToStorageDate(startDate),
          lte: dateStringToStorageDate(endDate),
        },
      },
      orderBy: {
        date: "asc",
      },
    }),
    getGoalsByUserId(userId),
  ]);

  const goal = getGoalByMetric(goals, metric);
  const recordMap = new Map(
    records.map((record) => [
      record.date.toISOString().slice(0, 10),
      {
        sleepHours: record.sleepHours === null ? null : Number(record.sleepHours),
        weightKg: record.weightKg === null ? null : Number(record.weightKg),
        waterMl: record.waterMl,
      },
    ]),
  );

  const points = dates.map((date) => {
    const rawValue = getMetricRawValue(metric, recordMap.get(date) ?? null);

    return {
      date,
      label: formatShortDateLabel(date),
      value: getMetricDisplayValue(metric, rawValue, profile),
      goalTarget: getGoalLineValue(metric, goal.targetValue, profile),
      goalMin: getGoalLineValue(metric, goal.minValue, profile),
      goalMax: getGoalLineValue(metric, goal.maxValue, profile),
    } satisfies TrendPoint;
  });

  const rawValues = dates
    .map((date) => getMetricRawValue(metric, recordMap.get(date) ?? null))
    .filter((value): value is number => value !== null);
  const latestRawValue =
    [...dates]
      .reverse()
      .map((date) => getMetricRawValue(metric, recordMap.get(date) ?? null))
      .find((value): value is number => value !== null) ?? null;
  const minRawValue = rawValues.length === 0 ? null : Math.min(...rawValues);
  const maxRawValue = rawValues.length === 0 ? null : Math.max(...rawValues);
  const averageRawValue =
    rawValues.length === 0
      ? null
      : rawValues.reduce((sum, value) => sum + value, 0) / rawValues.length;
  const metDays = goal.isActive
    ? dates.filter((date) =>
        evaluateGoal(getMetricRawValue(metric, recordMap.get(date) ?? null), goal) === true,
      ).length
    : null;

  return {
    metric: metricParam,
    metricLabel: metricLabels[metricParam],
    unitLabel: getMetricUnitLabel(metric, profile),
    days,
    startDate,
    endDate,
    recordedDays: rawValues.length,
    completionRate: roundTo((rawValues.length / days) * 100, 1),
    attainmentRate: metDays === null ? null : roundTo((metDays / days) * 100, 1),
    averageDisplay: formatMetricDisplay(metric, averageRawValue, profile),
    latestDisplay: formatMetricDisplay(metric, latestRawValue, profile),
    minDisplay: formatMetricDisplay(metric, minRawValue, profile),
    maxDisplay: formatMetricDisplay(metric, maxRawValue, profile),
    goalDescription: formatGoalDescription(metric, goal, profile),
    points,
  } satisfies TrendOverview;
}
