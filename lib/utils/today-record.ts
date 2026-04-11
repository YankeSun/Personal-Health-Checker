import { GoalMode, Metric } from "@prisma/client";

import {
  formatGoalDeviationDescription,
  formatGoalShortLabel,
} from "@/lib/utils/goal-copy";
import type { GoalView } from "@/lib/utils/goals";
import {
  fromDisplaySleep,
  fromDisplayWater,
  fromDisplayWeight,
} from "@/lib/utils/units";

export type RecordCompletionSummary = {
  completedCount: number;
  isComplete: boolean;
  hasAnyValue: boolean;
  missingMetrics: string[];
};

type TodayGoalProfile = {
  weightUnit: "KG" | "LB";
  waterUnit: "ML" | "OZ";
};

export type TodayGoalInsight = {
  metric: Metric;
  title: string;
  statusLabel: string;
  detail: string;
  tone: "neutral" | "success" | "warning";
};

const metricLabels = {
  [Metric.SLEEP]: "睡眠",
  [Metric.WEIGHT]: "体重",
  [Metric.WATER]: "饮水",
} as const;

export function getRecordCompletionSummary(values: {
  sleepHours: string;
  weight: string;
  water: string;
}): RecordCompletionSummary {
  const fields = [
    { label: "睡眠", value: values.sleepHours },
    { label: "体重", value: values.weight },
    { label: "饮水", value: values.water },
  ];

  const completedCount = fields.filter((field) => field.value.trim() !== "").length;

  return {
    completedCount,
    isComplete: completedCount === fields.length,
    hasAnyValue: completedCount > 0,
    missingMetrics: fields
      .filter((field) => field.value.trim() === "")
      .map((field) => field.label),
  };
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

export function getTodayGoalInsights(
  values: {
    sleepHours: string;
    weight: string;
    water: string;
  },
  goals: GoalView[],
  profile: TodayGoalProfile,
): TodayGoalInsight[] {
  const goalMap = new Map(goals.map((goal) => [goal.metric, goal]));
  const rawValues = {
    [Metric.SLEEP]: fromDisplaySleep(values.sleepHours),
    [Metric.WEIGHT]: fromDisplayWeight(values.weight, profile.weightUnit),
    [Metric.WATER]: fromDisplayWater(values.water, profile.waterUnit),
  };

  const insights = (Object.values(Metric) as Metric[])
    .map((metric): TodayGoalInsight | null => {
      const goal = goalMap.get(metric);

      if (!goal || !goal.isActive) {
        return null;
      }

      const goalLabel = formatGoalShortLabel(metric, goal, profile);

      if (!goalLabel) {
        return null;
      }

      const value = rawValues[metric];
      const isMet = evaluateGoal(value, goal);
      const deviation = formatGoalDeviationDescription(metric, goal, value, profile);

      if (value === null) {
        return {
          metric,
          title: metricLabels[metric],
          statusLabel: "今天会这样判断",
          detail: goalLabel,
          tone: "neutral",
        } satisfies TodayGoalInsight;
      }

      return {
        metric,
        title: metricLabels[metric],
        statusLabel: isMet ? "今天已对齐目标" : "今天还差一点",
        detail: deviation ?? goalLabel,
        tone: isMet ? "success" : "warning",
      } satisfies TodayGoalInsight;
    })
    .filter((insight): insight is TodayGoalInsight => insight !== null);

  return insights;
}
