import { GoalMode, Metric, WaterUnit, WeightUnit } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getGoalByMetric, getGoalsByUserId } from "@/lib/services/goals-service";
import {
  getDateRange,
  getDateStringInTimezone,
  shiftDateString,
  storageDateToDateString,
} from "@/lib/utils/dates";
import { GoalView, METRIC_ORDER } from "@/lib/utils/goals";
import { toDisplaySleep, toDisplayWater, toDisplayWeight } from "@/lib/utils/units";

type SupportedDashboardWindow = 7 | 30;

type DashboardProfile = {
  timezone: string;
  weightUnit: WeightUnit;
  waterUnit: WaterUnit;
};

type DashboardTodayMetric = {
  metric: Metric;
  label: string;
  unitLabel: string;
  displayValue: string | null;
  recorded: boolean;
  goalDescription: string | null;
  goalMet: boolean | null;
};

type DashboardWindowMetric = {
  metric: Metric;
  label: string;
  unitLabel: string;
  recordedDays: number;
  metDays: number | null;
  attainmentRate: number | null;
  averageDisplay: string | null;
  latestDisplay: string | null;
  goalDescription: string | null;
};

type DashboardWindowComparisonMetric = {
  metric: Metric;
  label: string;
  unitLabel: string;
  currentAverageDisplay: string | null;
  previousAverageDisplay: string | null;
  averageDeltaDisplay: string | null;
  averageDeltaDirection: "up" | "down" | "flat" | "none";
  attainmentRateChange: number | null;
};

type DashboardWindowComparison = {
  previousStartDate: string;
  previousEndDate: string;
  previousCompletionRate: number;
  completionRateChange: number;
  metrics: DashboardWindowComparisonMetric[];
};

type DashboardWindowSummary = {
  days: SupportedDashboardWindow;
  startDate: string;
  endDate: string;
  completeRecordDays: number;
  completionRate: number;
  metrics: DashboardWindowMetric[];
  comparison: DashboardWindowComparison;
};

export type DashboardOverview = {
  todayDate: string;
  streakDays: number;
  todayCompletedMetrics: number;
  totalTrackedMetrics: number;
  todayMetrics: DashboardTodayMetric[];
  windows: DashboardWindowSummary[];
};

type MetricSummaryComputation = DashboardWindowMetric & {
  averageValue: number | null;
};

const metricLabels = {
  [Metric.SLEEP]: "睡眠",
  [Metric.WEIGHT]: "体重",
  [Metric.WATER]: "饮水",
} as const;

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getMetricValue(
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

function getMetricUnitLabel(
  metric: Metric,
  profile: DashboardProfile,
) {
  if (metric === Metric.SLEEP) {
    return "小时";
  }

  if (metric === Metric.WEIGHT) {
    return profile.weightUnit === WeightUnit.KG ? "kg" : "lb";
  }

  return profile.waterUnit === WaterUnit.ML ? "ml" : "oz";
}

function getDisplayValue(
  metric: Metric,
  value: number | null,
  profile: DashboardProfile,
) {
  if (value === null) {
    return null;
  }

  if (metric === Metric.SLEEP) {
    return toDisplaySleep(value);
  }

  if (metric === Metric.WEIGHT) {
    return toDisplayWeight(value, profile.weightUnit);
  }

  return toDisplayWater(value, profile.waterUnit);
}

function formatGoalDescription(
  metric: Metric,
  goal: GoalView,
  profile: DashboardProfile,
) {
  if (!goal.isActive) {
    return null;
  }

  const unitLabel = getMetricUnitLabel(metric, profile);
  const target =
    goal.targetValue === null ? null : getDisplayValue(metric, goal.targetValue, profile);
  const min =
    goal.minValue === null ? null : getDisplayValue(metric, goal.minValue, profile);
  const max =
    goal.maxValue === null ? null : getDisplayValue(metric, goal.maxValue, profile);

  if (goal.mode === GoalMode.IN_RANGE) {
    return `${min} - ${max} ${unitLabel}`;
  }

  if (goal.mode === GoalMode.AT_MOST) {
    return `不超过 ${target} ${unitLabel}`;
  }

  return `至少 ${target} ${unitLabel}`;
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

function isCompleteRecord(record: {
  sleepHours: number | null;
  weightKg: number | null;
  waterMl: number | null;
} | null) {
  if (!record) {
    return false;
  }

  return (
    record.sleepHours !== null &&
    record.weightKg !== null &&
    record.waterMl !== null
  );
}

function calculateStreak(
  todayDate: string,
  recordMap: Map<string, { sleepHours: number | null; weightKg: number | null; waterMl: number | null }>,
) {
  let streak = 0;
  let cursor = todayDate;

  while (isCompleteRecord(recordMap.get(cursor) ?? null)) {
    streak += 1;
    cursor = getDateRange(cursor, 2)[0];
  }

  return streak;
}

function formatSignedDelta(
  metric: Metric,
  value: number,
  profile: DashboardProfile,
) {
  const normalized = roundTo(value, metric === Metric.WATER ? 0 : 2);

  if (Math.abs(normalized) < 0.01) {
    return "0";
  }

  const displayValue = getDisplayValue(metric, Math.abs(normalized), profile);

  if (!displayValue) {
    return null;
  }

  return `${normalized > 0 ? "+" : "-"}${displayValue}`;
}

function buildMetricSummary(
  metric: Metric,
  dates: string[],
  recordMap: Map<string, { sleepHours: number | null; weightKg: number | null; waterMl: number | null }>,
  goal: GoalView,
  profile: DashboardProfile,
) {
  const values = dates
    .map((date) => getMetricValue(metric, recordMap.get(date) ?? null))
    .filter((value): value is number => value !== null);
  const latestValue =
    [...dates]
      .reverse()
      .map((date) => getMetricValue(metric, recordMap.get(date) ?? null))
      .find((value): value is number => value !== null) ?? null;
  const metDays = goal.isActive
    ? dates.filter((date) =>
        evaluateGoal(getMetricValue(metric, recordMap.get(date) ?? null), goal) === true,
      ).length
    : null;
  const averageValue =
    values.length === 0
      ? null
      : roundTo(values.reduce((sum, value) => sum + value, 0) / values.length, 2);

  return {
    metric,
    label: metricLabels[metric],
    unitLabel: getMetricUnitLabel(metric, profile),
    recordedDays: values.length,
    metDays,
    attainmentRate:
      metDays === null ? null : roundTo((metDays / dates.length) * 100, 1),
    averageValue,
    averageDisplay: averageValue === null ? null : getDisplayValue(metric, averageValue, profile),
    latestDisplay: getDisplayValue(metric, latestValue, profile),
    goalDescription: formatGoalDescription(metric, goal, profile),
  } satisfies MetricSummaryComputation;
}

function buildWindowSummary(
  days: SupportedDashboardWindow,
  todayDate: string,
  recordMap: Map<string, { sleepHours: number | null; weightKg: number | null; waterMl: number | null }>,
  goals: GoalView[],
  profile: DashboardProfile,
) {
  const dates = getDateRange(todayDate, days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const previousEndDate = shiftDateString(startDate, -1);
  const previousDates = getDateRange(previousEndDate, days);
  const completeRecordDays = dates.filter((date) =>
    isCompleteRecord(recordMap.get(date) ?? null),
  ).length;
  const previousCompleteRecordDays = previousDates.filter((date) =>
    isCompleteRecord(recordMap.get(date) ?? null),
  ).length;
  const completionRate = roundTo((completeRecordDays / days) * 100, 1);
  const previousCompletionRate = roundTo((previousCompleteRecordDays / days) * 100, 1);
  const metrics = METRIC_ORDER.map((metric) =>
    buildMetricSummary(metric, dates, recordMap, getGoalByMetric(goals, metric), profile),
  );
  const previousMetricMap = new Map(
    METRIC_ORDER.map((metric) => [
      metric,
      buildMetricSummary(metric, previousDates, recordMap, getGoalByMetric(goals, metric), profile),
    ]),
  );

  return {
    days,
    startDate,
    endDate,
    completeRecordDays,
    completionRate,
    metrics: metrics.map(({ averageValue: _averageValue, ...metric }) => metric),
    comparison: {
      previousStartDate: previousDates[0],
      previousEndDate: previousDates[previousDates.length - 1],
      previousCompletionRate,
      completionRateChange: roundTo(completionRate - previousCompletionRate, 1),
      metrics: metrics.map((metric) => {
        const previousMetric = previousMetricMap.get(metric.metric)!;
        const averageDelta =
          metric.averageValue === null || previousMetric.averageValue === null
            ? null
            : roundTo(metric.averageValue - previousMetric.averageValue, 2);

        return {
          metric: metric.metric,
          label: metric.label,
          unitLabel: metric.unitLabel,
          currentAverageDisplay: metric.averageDisplay,
          previousAverageDisplay: previousMetric.averageDisplay,
          averageDeltaDisplay:
            averageDelta === null ? null : formatSignedDelta(metric.metric, averageDelta, profile),
          averageDeltaDirection:
            averageDelta === null
              ? "none"
              : Math.abs(averageDelta) < 0.01
                ? "flat"
                : averageDelta > 0
                  ? "up"
                  : "down",
          attainmentRateChange:
            metric.attainmentRate === null || previousMetric.attainmentRate === null
              ? null
              : roundTo(metric.attainmentRate - previousMetric.attainmentRate, 1),
        } satisfies DashboardWindowComparisonMetric;
      }),
    },
  } satisfies DashboardWindowSummary;
}

export async function getDashboardOverviewByUserId(
  userId: string,
  profile: DashboardProfile,
  windows: SupportedDashboardWindow[] = [7, 30],
) {
  const todayDate = getDateStringInTimezone(profile.timezone);
  const [records, goals] = await Promise.all([
    prisma.dailyRecord.findMany({
      where: {
        userId,
      },
      orderBy: {
        date: "asc",
      },
    }),
    getGoalsByUserId(userId),
  ]);

  const recordMap = new Map(
    records.map((record) => [
      storageDateToDateString(record.date),
      {
        sleepHours: record.sleepHours === null ? null : Number(record.sleepHours),
        weightKg: record.weightKg === null ? null : Number(record.weightKg),
        waterMl: record.waterMl,
      },
    ]),
  );

  const todayRecord = recordMap.get(todayDate) ?? null;

  return {
    todayDate,
    streakDays: calculateStreak(todayDate, recordMap),
    todayCompletedMetrics: METRIC_ORDER.filter(
      (metric) => getMetricValue(metric, todayRecord) !== null,
    ).length,
    totalTrackedMetrics: METRIC_ORDER.length,
    todayMetrics: METRIC_ORDER.map((metric) => {
      const value = getMetricValue(metric, todayRecord);
      const goal = getGoalByMetric(goals, metric);

      return {
        metric,
        label: metricLabels[metric],
        unitLabel: getMetricUnitLabel(metric, profile),
        displayValue: getDisplayValue(metric, value, profile),
        recorded: value !== null,
        goalDescription: formatGoalDescription(metric, goal, profile),
        goalMet: evaluateGoal(value, goal),
      } satisfies DashboardTodayMetric;
    }),
    windows: [...new Set(windows)]
      .sort((left, right) => left - right)
      .map((days) => buildWindowSummary(days, todayDate, recordMap, goals, profile)),
  } satisfies DashboardOverview;
}
