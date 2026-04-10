import { GoalMode, Metric, WaterUnit, WeightUnit } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getGoalByMetric, getGoalsByUserId } from "@/lib/services/goals-service";
import {
  dateStringToStorageDate,
  formatShortDateLabel,
  getDateRange,
  getDateStringInTimezone,
  shiftDateString,
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
  isBackfilled: boolean;
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
  insight: TrendInsight;
  comparison: TrendComparison;
  points: TrendPoint[];
};

export type TrendInsight = {
  tone: "warning" | "info" | "success";
  title: string;
  description: string;
};

export type TrendComparison = {
  previousStartDate: string;
  previousEndDate: string;
  previousCompletionRate: number;
  completionRateChange: number;
  previousAverageDisplay: string | null;
  averageDeltaDisplay: string | null;
  averageDeltaDirection: "up" | "down" | "flat" | "none";
  previousAttainmentRate: number | null;
  attainmentRateChange: number | null;
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

function formatSignedDelta(
  metric: Metric,
  rawValue: number,
  profile: TrendProfile,
) {
  const absoluteValue = Math.abs(rawValue);
  const display = formatMetricDisplay(metric, absoluteValue, profile);

  if (!display) {
    return null;
  }

  return `${rawValue > 0 ? "+" : "-"}${display}`;
}

function getDeltaDirection(value: number | null) {
  if (value === null) {
    return "none" as const;
  }

  if (Math.abs(value) < 0.01) {
    return "flat" as const;
  }

  return value > 0 ? ("up" as const) : ("down" as const);
}

function getMeaningfulChangeThreshold(metric: Metric) {
  if (metric === Metric.SLEEP) {
    return 0.3;
  }

  if (metric === Metric.WEIGHT) {
    return 0.4;
  }

  return 200;
}

function calculateFluctuation(rawValues: number[]): number {
  if (rawValues.length < 2) {
    return 0;
  }
  const mean = rawValues.reduce((sum, v) => sum + v, 0) / rawValues.length;
  const variance = rawValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / rawValues.length;
  return Math.sqrt(variance);
}

function getFluctuationThreshold(metric: Metric): number {
  if (metric === Metric.SLEEP) {
    return 0.5;
  }
  if (metric === Metric.WEIGHT) {
    return 0.8;
  }
  return 400;
}

function buildTrendInsight({
  metricLabel,
  days,
  recordedDays,
  completionRate,
  attainmentRate,
  averageDeltaRaw,
  averageDeltaDisplay,
  fluctuation,
  fluctuationDisplay,
  isFluctuating,
}: {
  metricLabel: string;
  days: SupportedTrendWindow;
  recordedDays: number;
  completionRate: number;
  attainmentRate: number | null;
  averageDeltaRaw: number | null;
  averageDeltaDisplay: string | null;
  fluctuation: number | null;
  fluctuationDisplay: string | null;
  isFluctuating: boolean;
}): TrendInsight {
  if (completionRate < 50) {
    return {
      tone: "warning",
      title: `先把${metricLabel}记录补齐`,
      description: `最近 ${days} 天只记录了 ${recordedDays}/${days} 天，这项趋势更容易被缺口打断。`,
    };
  }

  if (attainmentRate !== null && attainmentRate < 50) {
    return {
      tone: "warning",
      title: `${metricLabel}最近值得多看一眼`,
      description: `最近 ${days} 天达标率只有 ${attainmentRate}% ，可以先观察这项是不是最近最难保持。`,
    };
  }

  if (isFluctuating && fluctuationDisplay) {
    return {
      tone: "info",
      title: `${metricLabel}波动有点大`,
      description: `最近 ${days} 天的标准差是 ${fluctuationDisplay}。可以回顾一下，最近是不是这项的日常节奏被打乱了。`,
    };
  }

  if (
    averageDeltaRaw !== null &&
    averageDeltaDisplay !== null &&
    Math.abs(averageDeltaRaw) >= 0.01
  ) {
    return {
      tone: "info",
      title: `${metricLabel}最近出现了明显变化`,
      description: `相比上一周期，平均值变化了 ${averageDeltaDisplay}。`,
    };
  }

  return {
    tone: "success",
    title: `${metricLabel}最近比较稳定`,
    description: `最近 ${days} 天的记录频率和整体波动都比较平稳，可以继续保持现在的节奏。`,
  };
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
  const previousEndDate = shiftDateString(startDate, -1);
  const previousDates = getDateRange(previousEndDate, days);
  const previousStartDate = previousDates[0];

  const [records, goals] = await Promise.all([
    prisma.dailyRecord.findMany({
      where: {
        userId,
        date: {
          gte: dateStringToStorageDate(previousStartDate),
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
        isBackfilled: record.isBackfilled,
      },
    ]),
  );

  const points = dates.map((date) => {
    const record = recordMap.get(date) ?? null;
    const rawValue = getMetricRawValue(metric, record);

    return {
      date,
      label: formatShortDateLabel(date),
      value: getMetricDisplayValue(metric, rawValue, profile),
      goalTarget: getGoalLineValue(metric, goal.targetValue, profile),
      goalMin: getGoalLineValue(metric, goal.minValue, profile),
      goalMax: getGoalLineValue(metric, goal.maxValue, profile),
      isBackfilled: record?.isBackfilled ?? false,
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
  const fluctuation = rawValues.length < 2 ? null : calculateFluctuation(rawValues);
  const fluctuationThreshold = getFluctuationThreshold(metric);
  const isFluctuating = fluctuation !== null && fluctuation > fluctuationThreshold;
  const fluctuationDisplay =
    fluctuation === null ? null : formatMetricDisplay(metric, fluctuation, profile);
  const metDays = goal.isActive
    ? dates.filter((date) =>
        evaluateGoal(getMetricRawValue(metric, recordMap.get(date) ?? null), goal) === true,
      ).length
    : null;
  const previousRawValues = previousDates
    .map((date) => getMetricRawValue(metric, recordMap.get(date) ?? null))
    .filter((value): value is number => value !== null);
  const previousAverageRawValue =
    previousRawValues.length === 0
      ? null
      : previousRawValues.reduce((sum, value) => sum + value, 0) / previousRawValues.length;
  const previousCompletionRate = roundTo((previousRawValues.length / days) * 100, 1);
  const previousMetDays = goal.isActive
    ? previousDates.filter((date) =>
        evaluateGoal(getMetricRawValue(metric, recordMap.get(date) ?? null), goal) === true,
      ).length
    : null;
  const previousAttainmentRate =
    previousMetDays === null ? null : roundTo((previousMetDays / days) * 100, 1);
  const averageDeltaRaw =
    averageRawValue === null || previousAverageRawValue === null
      ? null
      : roundTo(averageRawValue - previousAverageRawValue, 2);
  const averageDeltaDirection = getDeltaDirection(averageDeltaRaw);
  const meaningfulChangeThreshold = getMeaningfulChangeThreshold(metric);
  const averageDeltaDisplay =
    averageDeltaRaw === null || Math.abs(averageDeltaRaw) < meaningfulChangeThreshold
      ? null
      : formatSignedDelta(metric, averageDeltaRaw, profile);
  const completionRateChange = roundTo(
    roundTo((rawValues.length / days) * 100, 1) - previousCompletionRate,
    1,
  );
  const attainmentRateChange =
    metDays === null || previousAttainmentRate === null
      ? null
      : roundTo(roundTo((metDays / days) * 100, 1) - previousAttainmentRate, 1);

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
    insight: buildTrendInsight({
      metricLabel: metricLabels[metricParam],
      days,
      recordedDays: rawValues.length,
      completionRate: roundTo((rawValues.length / days) * 100, 1),
      attainmentRate: metDays === null ? null : roundTo((metDays / days) * 100, 1),
      averageDeltaRaw:
        averageDeltaDisplay === null ? null : averageDeltaRaw,
      averageDeltaDisplay,
      fluctuation,
      fluctuationDisplay,
      isFluctuating,
    }),
    comparison: {
      previousStartDate,
      previousEndDate,
      previousCompletionRate,
      completionRateChange,
      previousAverageDisplay: formatMetricDisplay(metric, previousAverageRawValue, profile),
      averageDeltaDisplay,
      averageDeltaDirection,
      previousAttainmentRate,
      attainmentRateChange,
    },
    points,
  } satisfies TrendOverview;
}
