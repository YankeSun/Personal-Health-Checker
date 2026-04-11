import { GoalMode, Metric } from "@prisma/client";

import type { GoalView } from "@/lib/utils/goals";
import { toDisplaySleep, toDisplayWater, toDisplayWeight } from "@/lib/utils/units";

type GoalCopyProfile = {
  weightUnit: "KG" | "LB";
  waterUnit: "ML" | "OZ";
};

const goalMeta = {
  [Metric.SLEEP]: {
    title: "睡眠目标",
    metricLabel: "睡眠",
    description: "每天睡够这个时长，身体的恢复效果会更好。",
    recommendedMode: GoalMode.AT_LEAST,
    modeLabels: {
      [GoalMode.AT_LEAST]: "每天至少睡够",
      [GoalMode.AT_MOST]: "每天不超过",
      [GoalMode.IN_RANGE]: "保持在这个区间",
    },
  },
  [Metric.WEIGHT]: {
    title: "体重目标",
    metricLabel: "体重",
    description: "用一个稳定的区间来观察体重变化，比单值更容易判断趋势。",
    recommendedMode: GoalMode.IN_RANGE,
    modeLabels: {
      [GoalMode.AT_LEAST]: "至少保持",
      [GoalMode.AT_MOST]: "每天不超过",
      [GoalMode.IN_RANGE]: "保持在这个区间",
    },
  },
  [Metric.WATER]: {
    title: "饮水目标",
    metricLabel: "饮水",
    description: "每天累计喝够这个量，帮助身体保持水分平衡。",
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
    return `${metricLabel}记录落在 ${min} - ${max} ${unitLabel} 之间时，会算作当日达标。`;
  }

  if (goal.mode === GoalMode.AT_MOST && target) {
    return `${metricLabel}记录在 ${target} ${unitLabel} 以内时，会算作当日达标。`;
  }

  if (!target) {
    return null;
  }

  return `${metricLabel}记录达到 ${target} ${unitLabel} 及以上时，会算作当日达标。`;
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

    return "当前落在目标区间内";
  }

  if (goal.targetValue === null) {
    return null;
  }

  if (goal.mode === GoalMode.AT_MOST) {
    if (value > goal.targetValue) {
      return `超出上限 ${formatDelta(value - goal.targetValue)}`;
    }

    return `距离上限还剩 ${formatDelta(goal.targetValue - value)}`;
  }

  if (value < goal.targetValue) {
    return `距离目标还差 ${formatDelta(goal.targetValue - value)}`;
  }

  const delta = value - goal.targetValue;

  if (delta < 0.01) {
    return "刚好达到目标";
  }

  return `超过目标 ${formatDelta(delta)}`;
}
