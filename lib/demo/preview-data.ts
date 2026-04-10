import { GoalMode, Metric } from "@prisma/client";

import type { DashboardOverview } from "@/lib/services/dashboard-service";
import type { ReminderFeed } from "@/lib/services/reminder-service";
import type { TrendOverview } from "@/lib/services/trends-service";
import { formatDateLabel, formatShortDateLabel, getDateRange } from "@/lib/utils/dates";
import type { GoalView } from "@/lib/utils/goals";
import {
  toDisplaySleep,
  toDisplaySleepValue,
  toDisplayWater,
  toDisplayWaterValue,
  toDisplayWeight,
  toDisplayWeightValue,
} from "@/lib/utils/units";
import type { TrendDaysParam, TrendMetricParam } from "@/lib/validations/trends";

const PREVIEW_DATE = "2026-04-04";
const weightUnit = "KG" as const;
const waterUnit = "ML" as const;

type SupportedPreviewWindow = 7 | 30;

type MetricSeries = Record<string, number | null>;

type PreviewMetricSummary = {
  metric: Metric;
  label: string;
  unitLabel: string;
  recordedDays: number;
  metDays: number;
  attainmentRate: number;
  averageValue: number | null;
  averageDisplay: string | null;
  latestDisplay: string | null;
  goalDescription: string;
};

const metricLabels: Record<TrendMetricParam, string> = {
  sleep: "睡眠",
  weight: "体重",
  water: "饮水",
};

const dashboardMetricMeta = {
  [Metric.SLEEP]: { label: "睡眠", unitLabel: "小时" },
  [Metric.WEIGHT]: { label: "体重", unitLabel: "kg" },
  [Metric.WATER]: { label: "饮水", unitLabel: "ml" },
} as const;

const previewGoals: GoalView[] = [
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
];

const allDates = getDateRange(PREVIEW_DATE, 60);
const dates30 = allDates.slice(-30);

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildSleepSeries() {
  return Object.fromEntries(
    allDates.map((date, index) => {
      const value =
        index === dates30.length - 8
          ? null
          : roundTo(7 + ((index % 5) * 0.2) + (index % 7 === 0 ? -0.3 : 0.1), 1);

      return [date, value];
    }),
  ) satisfies MetricSeries;
}

function buildWeightSeries() {
  return Object.fromEntries(
    allDates.map((date, index) => {
      const value =
        index % 11 === 3
          ? null
          : roundTo(62.8 - index * 0.03 + (index % 6 === 0 ? 0.2 : 0), 1);

      return [date, value];
    }),
  ) satisfies MetricSeries;
}

function buildWaterSeries() {
  return Object.fromEntries(
    allDates.map((date, index) => {
      let value =
        index % 9 === 2
          ? null
          : 1750 + (index % 4) * 180 + (index % 6 === 0 ? 140 : 0);

      if (index === dates30.length - 1) {
        value = null;
      }

      return [date, value];
    }),
  ) satisfies MetricSeries;
}

const sleepSeries = buildSleepSeries();
const weightSeries = buildWeightSeries();
const waterSeries = buildWaterSeries();

function getGoalByMetric(metric: Metric) {
  return previewGoals.find((goal) => goal.metric === metric)!;
}

function getMetricRawValue(metric: Metric, date: string) {
  if (metric === Metric.SLEEP) {
    return sleepSeries[date] ?? null;
  }

  if (metric === Metric.WEIGHT) {
    return weightSeries[date] ?? null;
  }

  return waterSeries[date] ?? null;
}

function formatMetricDisplay(metric: Metric, value: number | null) {
  if (metric === Metric.SLEEP) {
    return toDisplaySleep(value);
  }

  if (metric === Metric.WEIGHT) {
    return toDisplayWeight(value, weightUnit);
  }

  return toDisplayWater(value, waterUnit);
}

function formatMetricChartValue(metric: Metric, value: number | null) {
  if (value === null) {
    return null;
  }

  if (metric === Metric.SLEEP) {
    return toDisplaySleepValue(value);
  }

  if (metric === Metric.WEIGHT) {
    return toDisplayWeightValue(value, weightUnit);
  }

  return toDisplayWaterValue(value, waterUnit);
}

function evaluateGoal(metric: Metric, value: number | null) {
  const goal = getGoalByMetric(metric);

  if (!goal.isActive || value === null) {
    return null;
  }

  if (goal.mode === GoalMode.IN_RANGE) {
    return value >= (goal.minValue ?? -Infinity) && value <= (goal.maxValue ?? Infinity);
  }

  if (goal.mode === GoalMode.AT_MOST) {
    return value <= (goal.targetValue ?? Infinity);
  }

  return value >= (goal.targetValue ?? 0);
}

function getGoalDescription(metric: Metric) {
  const goal = getGoalByMetric(metric);

  if (goal.mode === GoalMode.IN_RANGE) {
    return `${formatMetricDisplay(metric, goal.minValue)} - ${formatMetricDisplay(
      metric,
      goal.maxValue,
    )} ${dashboardMetricMeta[metric].unitLabel}`;
  }

  if (goal.mode === GoalMode.AT_MOST) {
    return `不超过 ${formatMetricDisplay(metric, goal.targetValue)} ${dashboardMetricMeta[metric].unitLabel}`;
  }

  return `至少 ${formatMetricDisplay(metric, goal.targetValue)} ${dashboardMetricMeta[metric].unitLabel}`;
}

function formatSignedDelta(metric: Metric, value: number) {
  const rounded = roundTo(value, metric === Metric.WATER ? 0 : 2);

  if (Math.abs(rounded) < 0.01) {
    return "0";
  }

  const displayValue = formatMetricDisplay(metric, Math.abs(rounded));

  if (!displayValue) {
    return null;
  }

  return `${rounded > 0 ? "+" : "-"}${displayValue}`;
}

function buildMetricSummary(metric: Metric, dates: string[]): PreviewMetricSummary {
  const values = dates
    .map((date) => getMetricRawValue(metric, date))
    .filter((value): value is number => value !== null);
  const latestValue =
    [...dates]
      .reverse()
      .map((date) => getMetricRawValue(metric, date))
      .find((value): value is number => value !== null) ?? null;
  const metDays = dates.filter((date) => evaluateGoal(metric, getMetricRawValue(metric, date)) === true).length;
  const averageValue =
    values.length === 0 ? null : roundTo(values.reduce((sum, value) => sum + value, 0) / values.length, 2);

  return {
    metric,
    label: dashboardMetricMeta[metric].label,
    unitLabel: dashboardMetricMeta[metric].unitLabel,
    recordedDays: values.length,
    metDays,
    attainmentRate: roundTo((metDays / dates.length) * 100, 1),
    averageValue,
    averageDisplay: averageValue === null ? null : formatMetricDisplay(metric, averageValue),
    latestDisplay: formatMetricDisplay(metric, latestValue),
    goalDescription: getGoalDescription(metric),
  };
}

function buildWindowSummary(days: SupportedPreviewWindow) {
  const dates = allDates.slice(-days);
  const previousDates = allDates.slice(-(days * 2), -days);
  const completeRecordDays = dates.filter((date) => {
    return (
      sleepSeries[date] !== null &&
      sleepSeries[date] !== undefined &&
      weightSeries[date] !== null &&
      weightSeries[date] !== undefined &&
      waterSeries[date] !== null &&
      waterSeries[date] !== undefined
    );
  }).length;
  const previousCompleteRecordDays = previousDates.filter((date) => {
    return (
      sleepSeries[date] !== null &&
      sleepSeries[date] !== undefined &&
      weightSeries[date] !== null &&
      weightSeries[date] !== undefined &&
      waterSeries[date] !== null &&
      waterSeries[date] !== undefined
    );
  }).length;
  const metrics = [Metric.SLEEP, Metric.WEIGHT, Metric.WATER].map((metric) =>
    buildMetricSummary(metric, dates),
  );
  const previousMetricMap = new Map(
    [Metric.SLEEP, Metric.WEIGHT, Metric.WATER].map((metric) => [
      metric,
      buildMetricSummary(metric, previousDates),
    ]),
  );

  return {
    days,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    completeRecordDays,
    completionRate: roundTo((completeRecordDays / days) * 100, 1),
    metrics: metrics.map(({ averageValue: _averageValue, ...metric }) => metric),
    comparison: {
      previousStartDate: previousDates[0],
      previousEndDate: previousDates[previousDates.length - 1],
      previousCompletionRate: roundTo((previousCompleteRecordDays / days) * 100, 1),
      completionRateChange: roundTo(((completeRecordDays - previousCompleteRecordDays) / days) * 100, 1),
      metrics: metrics.map((metric) => {
        const previousMetric = previousMetricMap.get(metric.metric)!;
        const averageDelta =
          metric.averageValue === null || previousMetric.averageValue === null
            ? null
            : roundTo(metric.averageValue - previousMetric.averageValue, 2);
        const averageDeltaDirection: "up" | "down" | "flat" | "none" =
          averageDelta === null
            ? "none"
            : Math.abs(averageDelta) < 0.01
              ? "flat"
              : averageDelta > 0
                ? "up"
                : "down";

        return {
          metric: metric.metric,
          label: metric.label,
          unitLabel: metric.unitLabel,
          currentAverageDisplay: metric.averageDisplay,
          previousAverageDisplay: previousMetric.averageDisplay,
          averageDeltaDisplay: averageDelta === null ? null : formatSignedDelta(metric.metric, averageDelta),
          averageDeltaDirection,
          attainmentRateChange: roundTo(metric.attainmentRate - previousMetric.attainmentRate, 1),
        };
      }),
    },
  };
}

export const previewDashboardOverview: DashboardOverview = {
  todayDate: PREVIEW_DATE,
  streakDays: 0,
  todayCompletedMetrics: 2,
  totalTrackedMetrics: 3,
  todayMetrics: [Metric.SLEEP, Metric.WEIGHT, Metric.WATER].map((metric) => {
    const todayValue = getMetricRawValue(metric, PREVIEW_DATE);

    return {
      metric,
      label: dashboardMetricMeta[metric].label,
      unitLabel: dashboardMetricMeta[metric].unitLabel,
      displayValue: formatMetricDisplay(metric, todayValue) || null,
      recorded: todayValue !== null,
      goalDescription: getGoalDescription(metric),
      goalMet: evaluateGoal(metric, todayValue),
    };
  }),
  insights: [
    {
      id: "today-focus",
      tone: "warning",
      title: "今天先补饮水",
      description: "只差这一项，今天这组就完整了。",
      actionHref: "/experience?screen=today",
      actionLabel: "回到今日记录",
    },
    {
      id: "weekly-focus-goal",
      tone: "warning",
      title: "这周最该先看的是饮水",
      description: "最近 7 天饮水目标完成得最不稳定，先把这项拉回稳定节奏更划算。",
      actionHref: "/experience?screen=trends&metric=water&days=7",
      actionLabel: "查看最近 7 天",
    },
  ],
  windows: [buildWindowSummary(7), buildWindowSummary(30)],
};

export const previewReminderFeed: ReminderFeed = {
  enabled: true,
  todayDate: PREVIEW_DATE,
  reminders: [
    {
      id: "missing-water-today",
      tone: "warning",
      title: "今天还差饮水数据没有补录",
      description: "睡眠和体重已经记下来了，再补上饮水，今天的完成度就会从 2/3 变成完整记录。",
      actionHref: "/experience?screen=today",
      actionLabel: "回到今日记录",
    },
    {
      id: "water-attainment-pressure",
      tone: "info",
      title: "最近 7 天饮水达标率只有 42.9%",
      description: "趋势图里能看见饮水记录很不稳定，这是当前最值得先改善的一项。",
      actionHref: "/experience?screen=trends&metric=water&days=7",
      actionLabel: "查看饮水趋势",
    },
    {
      id: "weight-in-range",
      tone: "success",
      title: "体重仍然稳定在目标区间附近",
      description: "最近一个月的体重波动相对平稳，说明你的作息和饮食节奏正在逐渐稳定下来。",
      actionHref: "/experience?screen=trends&metric=weight&days=30",
      actionLabel: "查看体重趋势",
    },
  ],
};

export const previewTodayValues = {
  date: PREVIEW_DATE,
  dateLabel: formatDateLabel(PREVIEW_DATE),
  timezone: "Asia/Shanghai",
  sleepHours: toDisplaySleep(sleepSeries[PREVIEW_DATE]),
  weight: toDisplayWeight(weightSeries[PREVIEW_DATE], weightUnit),
  water: toDisplayWater(waterSeries[PREVIEW_DATE], waterUnit),
  weightUnit,
  waterUnit,
  reminderEnabled: true,
};

export const previewProfileValues = {
  email: "member@healthtracker.app",
  displayName: "晚风记录者",
  timezone: "Asia/Shanghai",
  weightUnit,
  waterUnit,
  reminderEnabled: true,
};

export const previewGoalsValues = {
  weightUnit,
  waterUnit,
  goals: previewGoals,
};

function buildTrend(metricParam: TrendMetricParam, daysParam: TrendDaysParam): TrendOverview {
  const days = Number(daysParam) as SupportedPreviewWindow;
  const dates = dates30.slice(-days);
  const previousDates = allDates.slice(-(days * 2), -days);
  const metric =
    metricParam === "sleep" ? Metric.SLEEP : metricParam === "weight" ? Metric.WEIGHT : Metric.WATER;
  const values = dates.map((date) => getMetricRawValue(metric, date));
  const validValues = values.filter((value): value is number => value !== null);
  const metDays = dates.filter((date) => evaluateGoal(metric, getMetricRawValue(metric, date)) === true).length;
  const goal = getGoalByMetric(metric);
  const previousValues = previousDates.map((date) => getMetricRawValue(metric, date));
  const previousValidValues = previousValues.filter((value): value is number => value !== null);
  const previousAverage =
    previousValidValues.length === 0
      ? null
      : previousValidValues.reduce((sum, value) => sum + value, 0) / previousValidValues.length;
  const currentAverage =
    validValues.length === 0
      ? null
      : validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  const averageDelta =
    currentAverage === null || previousAverage === null
      ? null
      : roundTo(currentAverage - previousAverage, 2);
  const averageDeltaDisplay = averageDelta === null ? null : formatSignedDelta(metric, averageDelta);
  const previousMetDays = previousDates.filter(
    (date) => evaluateGoal(metric, getMetricRawValue(metric, date)) === true,
  ).length;
  const completionRate = roundTo((validValues.length / days) * 100, 1);
  const attainmentRate = roundTo((metDays / days) * 100, 1);

  return {
    metric: metricParam,
    metricLabel: metricLabels[metricParam],
    unitLabel: dashboardMetricMeta[metric].unitLabel,
    days,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    recordedDays: validValues.length,
    completionRate,
    attainmentRate,
    averageDisplay:
      validValues.length === 0
        ? null
        : formatMetricDisplay(metric, validValues.reduce((sum, value) => sum + value, 0) / validValues.length),
    latestDisplay:
      formatMetricDisplay(
        metric,
        [...dates]
          .reverse()
          .map((date) => getMetricRawValue(metric, date))
          .find((value): value is number => value !== null) ?? null,
      ) || null,
    minDisplay: formatMetricDisplay(metric, validValues.length ? Math.min(...validValues) : null) || null,
    maxDisplay: formatMetricDisplay(metric, validValues.length ? Math.max(...validValues) : null) || null,
    goalDescription: getGoalDescription(metric),
    insight:
      completionRate < 50
        ? {
            tone: "warning",
            title: `先把${metricLabels[metricParam]}记录补齐`,
            description: `最近 ${days} 天只记录了 ${validValues.length}/${days} 天，这项趋势更容易被缺口打断。`,
          }
        : attainmentRate < 50
          ? {
              tone: "warning",
              title: `${metricLabels[metricParam]}最近值得多看一眼`,
              description: `最近 ${days} 天达标率只有 ${attainmentRate}% ，可以先观察这项最近为什么更难保持。`,
            }
          : averageDeltaDisplay
            ? {
                tone: "info",
                title: `${metricLabels[metricParam]}最近出现了明显变化`,
                description: `相比上一周期，平均值变化了 ${averageDeltaDisplay}。`,
              }
            : {
                tone: "success",
                title: `${metricLabels[metricParam]}最近比较稳定`,
                description: `最近 ${days} 天的记录频率和整体波动都比较平稳。`,
              },
    comparison: {
      previousStartDate: previousDates[0],
      previousEndDate: previousDates[previousDates.length - 1],
      previousCompletionRate: roundTo((previousValidValues.length / days) * 100, 1),
      completionRateChange: roundTo(completionRate - roundTo((previousValidValues.length / days) * 100, 1), 1),
      previousAverageDisplay: formatMetricDisplay(metric, previousAverage) || null,
      averageDeltaDisplay,
      averageDeltaDirection:
        averageDelta === null
          ? "none"
          : Math.abs(averageDelta) < 0.01
            ? "flat"
            : averageDelta > 0
              ? "up"
              : "down",
      previousAttainmentRate: roundTo((previousMetDays / days) * 100, 1),
      attainmentRateChange: roundTo(attainmentRate - roundTo((previousMetDays / days) * 100, 1), 1),
    },
    points: dates.map((date) => ({
      date,
      label: formatShortDateLabel(date),
      value: formatMetricChartValue(metric, getMetricRawValue(metric, date)),
      goalTarget: formatMetricChartValue(metric, goal.targetValue),
      goalMin: formatMetricChartValue(metric, goal.minValue),
      goalMax: formatMetricChartValue(metric, goal.maxValue),
    })),
  };
}

export function getPreviewTrend(metric: TrendMetricParam, days: TrendDaysParam) {
  return buildTrend(metric, days);
}
