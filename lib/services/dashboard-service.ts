import { GoalMode, Metric, WaterUnit, WeightUnit } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getGoalByMetric, getGoalsByUserId } from "@/lib/services/goals-service";
import {
  getDateRange,
  getDateStringInTimezone,
  shiftDateString,
  storageDateToDateString,
} from "@/lib/utils/dates";
import {
  formatGoalDeviationDescription,
  formatGoalRuleDescription,
  getGoalUnitLabel,
} from "@/lib/utils/goal-copy";
import { GoalView, METRIC_ORDER } from "@/lib/utils/goals";
import { getStreakMomentum } from "@/lib/utils/streak";
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
  goalDeviationDescription: string | null;
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
  insights: DashboardInsight[];
  windows: DashboardWindowSummary[];
};

export type DashboardInsight = {
  id: string;
  tone: "warning" | "info" | "success";
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
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
    unitLabel: getGoalUnitLabel(metric, profile),
    recordedDays: values.length,
    metDays,
    attainmentRate:
      metDays === null ? null : roundTo((metDays / dates.length) * 100, 1),
    averageValue,
    averageDisplay: averageValue === null ? null : getDisplayValue(metric, averageValue, profile),
    latestDisplay: getDisplayValue(metric, latestValue, profile),
    goalDescription: formatGoalRuleDescription(metric, goal, profile),
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

function buildTodayInsight(
  todayRecord: { sleepHours: number | null; weightKg: number | null; waterMl: number | null } | null,
  streakDays: number,
): DashboardInsight {
  const missingMetrics = METRIC_ORDER.filter(
    (metric) => getMetricValue(metric, todayRecord) === null,
  );

  if (missingMetrics.length > 0) {
    const firstMissingMetric = missingMetrics[0];
    const missingLabels = missingMetrics.map((metric) => metricLabels[metric]).join("、");

    return {
      id: "today-focus",
      tone: "warning",
      title: `今天先补${metricLabels[firstMissingMetric]}`,
      description:
        missingMetrics.length === 1
          ? "只差这一项，今天这组就完整了。"
          : `还差 ${missingLabels}，先补齐今天这组，连续记录和趋势都会更完整。`,
      actionHref: "/today",
      actionLabel: "回到今日记录",
    };
  }

  const streakMomentum = getStreakMomentum(streakDays);

  if (streakMomentum.nextMilestone) {
    return {
      id: "streak-momentum",
      tone: "success",
      title: `连续记录已经到 ${streakDays} 天`,
      description: `再坚持 ${streakMomentum.daysRemaining} 天，就会到 ${streakMomentum.nextMilestone} 天连续记录。`,
      actionHref: "/today",
      actionLabel: "保持今天这组",
    };
  }

  return {
    id: "streak-stable",
    tone: "success",
    title: "连续记录已经比较稳定",
    description: "继续保持这套节奏，最近的变化会更容易被看出来。",
    actionHref: "/trends",
    actionLabel: "去看最近趋势",
  };
}

function buildPeriodChangeInsight(
  windowSummary: DashboardWindowSummary | undefined,
  profile: DashboardProfile,
): DashboardInsight | null {
  if (!windowSummary || windowSummary.comparison.metrics.length === 0) {
    return null;
  }

  const metricsWithChange = windowSummary.comparison.metrics
    .map((m) => {
      const metricDelta = windowSummary.metrics.find((s) => s.metric === m.metric);
      return {
        metric: m.metric,
        label: m.label,
        currentAverageDisplay: m.currentAverageDisplay,
        previousAverageDisplay: m.previousAverageDisplay,
        averageDeltaDisplay: m.averageDeltaDisplay,
        averageDeltaDirection: m.averageDeltaDirection,
        attainmentRateChange: m.attainmentRateChange,
        currentAttainmentRate: metricDelta?.attainmentRate ?? null,
      };
    })
    .filter((m) => m.averageDeltaDisplay !== null && m.averageDeltaDirection !== "none");

  if (metricsWithChange.length === 0) {
    return null;
  }

  const mostImproved = [...metricsWithChange]
    .filter((m) => m.attainmentRateChange !== null && m.attainmentRateChange > 0)
    .sort((a, b) => (b.attainmentRateChange ?? 0) - (a.attainmentRateChange ?? 0))[0];

  const mostDeclined = [...metricsWithChange]
    .filter((m) => m.attainmentRateChange !== null && m.attainmentRateChange < 0)
    .sort((a, b) => (a.attainmentRateChange ?? 0) - (b.attainmentRateChange ?? 0))[0];

  if (mostImproved && mostDeclined) {
    return {
      id: "period-change-summary",
      tone: "info",
      title: `最近 ${windowSummary.days} 天变化小结`,
      description: `${mostImproved.label}进步最明显（达标率 +${mostImproved.attainmentRateChange}%），${mostDeclined.label}需要多关注（达标率 ${mostDeclined.attainmentRateChange}%）。可以优先把注意力放在${mostDeclined.label}上。`,
      actionHref: `/trends?metric=${mostDeclined.metric.toLowerCase()}&days=${windowSummary.days}`,
      actionLabel: `查看${mostDeclined.label}趋势`,
    };
  }

  if (mostImproved) {
    return {
      id: "period-improvement",
      tone: "success",
      title: `最近 ${windowSummary.days} 天${mostImproved.label}进步明显`,
      description: `${mostImproved.label}达标率提升了 +${mostImproved.attainmentRateChange}%，继续保持这个节奏。`,
      actionHref: `/trends?metric=${mostImproved.metric.toLowerCase()}&days=${windowSummary.days}`,
      actionLabel: `查看${mostImproved.label}趋势`,
    };
  }

  if (mostDeclined) {
    return {
      id: "period-decline",
      tone: "warning",
      title: `最近 ${windowSummary.days} 天${mostDeclined.label}需要关注`,
      description: `${mostDeclined.label}达标率下降了 ${mostDeclined.attainmentRateChange}%，可以先回顾一下最近这项的日常节奏。`,
      actionHref: `/trends?metric=${mostDeclined.metric.toLowerCase()}&days=${windowSummary.days}`,
      actionLabel: `查看${mostDeclined.label}趋势`,
    };
  }

  return null;
}

function buildWeeklyFocusInsight(
  windowSummary: DashboardWindowSummary | undefined,
): DashboardInsight | null {
  if (!windowSummary) {
    return null;
  }

  const lowestRecordedMetric = [...windowSummary.metrics].sort(
    (left, right) => left.recordedDays - right.recordedDays,
  )[0];
  const highestRecordedDays = Math.max(
    ...windowSummary.metrics.map((metric) => metric.recordedDays),
  );

  if (
    lowestRecordedMetric &&
    lowestRecordedMetric.recordedDays <= Math.floor(windowSummary.days * 0.65) &&
    highestRecordedDays - lowestRecordedMetric.recordedDays >= 2
  ) {
    return {
      id: "weekly-focus-recording",
      tone: "info",
      title: `这周最容易断的是${lowestRecordedMetric.label}`,
      description: `最近 ${windowSummary.days} 天只记录了 ${lowestRecordedMetric.recordedDays}/${windowSummary.days} 天，先把这项补稳，趋势会更有参考价值。`,
      actionHref: `/trends?metric=${lowestRecordedMetric.metric.toLowerCase()}&days=7`,
      actionLabel: "查看这项趋势",
    };
  }

  const weakestGoalMetric = [...windowSummary.metrics]
    .filter((metric) => metric.attainmentRate !== null)
    .sort((left, right) => (left.attainmentRate ?? 0) - (right.attainmentRate ?? 0))[0];

  if (weakestGoalMetric && (weakestGoalMetric.attainmentRate ?? 0) < 50) {
    return {
      id: "weekly-focus-goal",
      tone: "warning",
      title: `这周最该先看的是${weakestGoalMetric.label}`,
      description: `最近 ${windowSummary.days} 天达标率只有 ${weakestGoalMetric.attainmentRate}% ，可以先观察这项是不是最近最难保持。`,
      actionHref: `/trends?metric=${weakestGoalMetric.metric.toLowerCase()}&days=7`,
      actionLabel: "查看最近 7 天",
    };
  }

  const strongestMetric = [...windowSummary.metrics]
    .filter((metric) => metric.attainmentRate !== null)
    .sort((left, right) => (right.attainmentRate ?? 0) - (left.attainmentRate ?? 0))[0];

  if (strongestMetric) {
    return {
      id: "weekly-focus-stable",
      tone: "success",
      title: `这周最稳定的是${strongestMetric.label}`,
      description: `最近 ${windowSummary.days} 天达标率 ${strongestMetric.attainmentRate}% ，这是你当前最容易保持的一项。`,
      actionHref: `/trends?metric=${strongestMetric.metric.toLowerCase()}&days=7`,
      actionLabel: "看看这项变化",
    };
  }

  return null;
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
  const streakDays = calculateStreak(todayDate, recordMap);
  const windowSummaries = [...new Set(windows)]
    .sort((left, right) => left - right)
    .map((days) => buildWindowSummary(days, todayDate, recordMap, goals, profile));
  const summary7 = windowSummaries.find((window) => window.days === 7);
  const summary30 = windowSummaries.find((window) => window.days === 30);
  const insights = [
    buildTodayInsight(todayRecord, streakDays),
    buildWeeklyFocusInsight(summary7),
    buildPeriodChangeInsight(summary30, profile),
  ].filter((item): item is DashboardInsight => Boolean(item));

  return {
    todayDate,
    streakDays,
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
        unitLabel: getGoalUnitLabel(metric, profile),
        displayValue: getDisplayValue(metric, value, profile),
        recorded: value !== null,
        goalDescription: formatGoalRuleDescription(metric, goal, profile),
        goalDeviationDescription: formatGoalDeviationDescription(metric, goal, value, profile),
        goalMet: evaluateGoal(value, goal),
      } satisfies DashboardTodayMetric;
    }),
    insights,
    windows: windowSummaries,
  } satisfies DashboardOverview;
}
