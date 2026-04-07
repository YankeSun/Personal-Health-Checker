import { GoalMode, Metric } from "@prisma/client";

import { prisma } from "@/lib/db";
import { GoalInput } from "@/lib/validations/goals";
import { getEmptyGoal, GoalView, METRIC_ORDER, serializeGoal } from "@/lib/utils/goals";

function normalizeGoalInput(input: GoalInput) {
  if (input.mode === GoalMode.IN_RANGE) {
    return {
      mode: input.mode,
      isActive: input.isActive,
      targetValue: null,
      minValue: input.minValue,
      maxValue: input.maxValue,
    };
  }

  return {
    mode: input.mode,
    isActive: input.isActive,
    targetValue: input.targetValue,
    minValue: null,
    maxValue: null,
  };
}

export async function getGoalsByUserId(userId: string) {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
    },
  });

  const goalMap = new Map(goals.map((goal) => [goal.metric, serializeGoal(goal)]));

  return METRIC_ORDER.map((metric) => goalMap.get(metric) ?? getEmptyGoal(metric));
}

export async function upsertGoalsByUserId(userId: string, inputs: GoalInput[]) {
  const goals = await prisma.$transaction(async (tx) => {
    const records = await Promise.all(
      inputs.map((input) =>
        tx.goal.upsert({
          where: {
            userId_metric: {
              userId,
              metric: input.metric,
            },
          },
          create: {
            userId,
            metric: input.metric,
            ...normalizeGoalInput(input),
          },
          update: normalizeGoalInput(input),
        }),
      ),
    );

    return records.map((record) => serializeGoal(record));
  });

  const goalMap = new Map(goals.map((goal) => [goal.metric, goal]));
  return METRIC_ORDER.map((metric) => goalMap.get(metric) ?? getEmptyGoal(metric));
}

export function getGoalByMetric(goals: GoalView[], metric: Metric) {
  return goals.find((goal) => goal.metric === metric) ?? getEmptyGoal(metric);
}
