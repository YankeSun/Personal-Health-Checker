import { GoalMode, Metric, Prisma } from "@prisma/client";

export const METRIC_ORDER = [Metric.SLEEP, Metric.WEIGHT, Metric.WATER] as const;

export type GoalView = {
  metric: Metric;
  mode: GoalMode;
  isActive: boolean;
  targetValue: number | null;
  minValue: number | null;
  maxValue: number | null;
};

export function getDefaultGoalMode(metric: Metric) {
  return metric === Metric.WEIGHT ? GoalMode.IN_RANGE : GoalMode.AT_LEAST;
}

export function getEmptyGoal(metric: Metric): GoalView {
  return {
    metric,
    mode: getDefaultGoalMode(metric),
    isActive: false,
    targetValue: null,
    minValue: null,
    maxValue: null,
  };
}

export function serializeGoal(goal: {
  metric: Metric;
  mode: GoalMode;
  isActive: boolean;
  targetValue: Prisma.Decimal | number | null;
  minValue: Prisma.Decimal | number | null;
  maxValue: Prisma.Decimal | number | null;
}) {
  return {
    metric: goal.metric,
    mode: goal.mode,
    isActive: goal.isActive,
    targetValue: goal.targetValue === null ? null : Number(goal.targetValue),
    minValue: goal.minValue === null ? null : Number(goal.minValue),
    maxValue: goal.maxValue === null ? null : Number(goal.maxValue),
  } satisfies GoalView;
}
