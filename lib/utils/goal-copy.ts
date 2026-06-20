import { GoalMode, Metric } from "@prisma/client";

import type { GoalView } from "@/lib/utils/goals";
import { toDisplaySleep, toDisplayWater, toDisplayWeight } from "@/lib/utils/units";

type GoalCopyProfile = {
  weightUnit: "KG" | "LB";
  waterUnit: "ML" | "OZ";
};

const goalMeta = {
  [Metric.SLEEP]: {
    title: "睡眠",
    metricLabel: "睡眠",
    description: "给夜晚一个可回看的下限。",
    recommendedMode: GoalMode.AT_LEAST,
    modeLabels: {
      [GoalMode.AT_LEAST]: "每天至少睡够",
      [GoalMode.AT_MOST]: "每天不超过",
      [GoalMode.IN_RANGE]: "保持在这个区间",
    },
  },
  [Metric.WEIGHT]: {
    title: "体重",
    metricLabel: "体重",
    description: "用区间观察长期变化，比单点更稳。",
    recommendedMode: GoalMode.IN_RANGE,
    modeLabels: {
      [GoalMode.AT_LEAST]: "至少保持",
      [GoalMode.AT_MOST]: "每天不超过",
      [GoalMode.IN_RANGE]: "保持在这个区间",
    },
  },
  [Metric.WATER]: {
    title: "饮水",
    metricLabel: "饮水",
    description: "给每天的饮水留一个清楚下限。",
    recommendedMode: GoalMode.AT_LEAST,
    modeLabels: {
      [GoalMode.AT_LEAST]: "每天至少喝够",
      [GoalMode.AT_MOST]: "每天不超过",
      [GoalMode.IN_RANGE]: "保持在这个区间",
    },
  },
} as const;

export function getGoalMeta(metric: Metric) {
  return goalMeta[metric];
}

export function getGoalUnitLabel(metric: Metric, profile: GoalCopyProfile) {
  if (metric === Metric.SLEEP) {
    return "小时";
  }

  if (metric === Metric.WEIGHT) {
    return profile.weightUnit === "KG" ? "kg" : "lb";
  }

  return profile.waterUnit === "ML" ? "ml" : "oz";
}

function formatGoalValue(
  metric: Metric,
  value: number | null,
  profile: GoalCopyProfile,
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

export function formatGoalShortLabel(
  metric: Metric,
  goal: GoalView,
  profile: GoalCopyProfile,
) {
  if (!goal.isActive) {
    return null;
  }

  const unitLabel = getGoalUnitLabel(metric, profile);
  const target = formatGoalValue(metric, goal.targetValue, profile);
  const min = formatGoalValue(metric, goal.minValue, profile);
  const max = formatGoalValue(metric, goal.maxValue, profile);
  const metricLabel = getGoalMeta(metric).metricLabel;

  if (goal.mode === GoalMode.IN_RANGE && min && max) {
    return `${metricLabel}保持在 ${min} - ${max} ${unitLabel}`;
  }

  if (goal.mode === GoalMode.AT_MOST && target) {
    return `${metricLabel}控制在 ${target} ${unitLabel} 以内`;
  }

  if (!target) {
    return null;
  }

  if (metric === Metric.SLEEP) {
    return `每天睡够 ${target} ${unitLabel}`;
  }

  if (metric === Metric.WATER) {
    return `每天喝够 ${target} ${unitLabel}`;
  }

  return `${metricLabel}至少 ${target} ${unitLabel}`;
}

export function formatGoalRuleDescription(
  metric: Metric,
  goal: GoalView,
  profile: GoalCopyProfile,
) {
  if (!goal.isActive) {
    return null;
  }

  const unitLabel = getGoalUnitLabel(metric, profile);
  const target = formatGoalValue(metric, goal.targetValue, profile);
  const min = formatGoalValue(metric, goal.minValue, profile);
  const max = formatGoalValue(metric, goal.maxValue, profile);
  const metricLabel = getGoalMeta(metric).metricLabel;

  if (goal.mode === GoalMode.IN_RANGE && min && max) {
    return `${metricLabel}落在 ${min} - ${max} ${unitLabel} 之间，计为达标。`;
  }

  if (goal.mode === GoalMode.AT_MOST && target) {
    return `${metricLabel}不高于 ${target} ${unitLabel}，计为达标。`;
  }

  if (!target) {
    return null;
  }

  return `${metricLabel}达到 ${target} ${unitLabel} 及以上，计为达标。`;
}

export function formatGoalDeviationDescription(
  metric: Metric,
  goal: GoalView,
  value: number | null,
  profile: GoalCopyProfile,
) {
  if (!goal.isActive || value === null) {
    return null;
  }

  const formatDelta = (delta: number) => `${formatGoalValue(metric, delta, profile)} ${getGoalUnitLabel(metric, profile)}`;

  if (goal.mode === GoalMode.IN_RANGE) {
    if (goal.minValue === null || goal.maxValue === null) {
      return null;
    }

    if (value < goal.minValue) {
      return `距离目标区间还差 ${formatDelta(goal.minValue - value)}`;
    }

    if (value > goal.maxValue) {
      return `高出目标区间 ${formatDelta(value - goal.maxValue)}`;
    }

    return "已在目标区间内";
  }

  if (goal.targetValue === null) {
    return null;
  }

  if (goal.mode === GoalMode.AT_MOST) {
    if (value > goal.targetValue) {
      return `超出上限 ${formatDelta(value - goal.targetValue)}`;
    }

    return `距离上限还余 ${formatDelta(goal.targetValue - value)}`;
  }

  if (value < goal.targetValue) {
    return `距离目标还差 ${formatDelta(goal.targetValue - value)}`;
  }

  const delta = value - goal.targetValue;

  if (delta < 0.01) {
    return "刚好对齐目标";
  }

  return `超过目标 ${formatDelta(delta)}`;
}
