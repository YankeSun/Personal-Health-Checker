import { GoalMode, Metric, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { getGoalsByUserId, upsertGoalsByUserId } from "@/lib/services/goals-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    goal: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("goals-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty defaults for missing goals", async () => {
    vi.mocked(prisma.goal.findMany).mockResolvedValue([]);

    const goals = await getGoalsByUserId("user_1");

    expect(goals).toHaveLength(3);
    expect(goals[0]).toMatchObject({
      metric: Metric.SLEEP,
      isActive: false,
    });
    expect(goals[1]).toMatchObject({
      metric: Metric.WEIGHT,
      mode: GoalMode.IN_RANGE,
    });
  });

  it("upserts all goals and preserves metric ordering", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        goal: {
          upsert: vi
            .fn()
            .mockResolvedValueOnce({
              id: "goal_sleep",
              userId: "user_1",
              metric: Metric.SLEEP,
              mode: GoalMode.AT_LEAST,
              isActive: true,
              targetValue: new Prisma.Decimal("8"),
              minValue: null,
              maxValue: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .mockResolvedValueOnce({
              id: "goal_weight",
              userId: "user_1",
              metric: Metric.WEIGHT,
              mode: GoalMode.IN_RANGE,
              isActive: true,
              targetValue: null,
              minValue: new Prisma.Decimal("58"),
              maxValue: new Prisma.Decimal("62"),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .mockResolvedValueOnce({
              id: "goal_water",
              userId: "user_1",
              metric: Metric.WATER,
              mode: GoalMode.AT_LEAST,
              isActive: false,
              targetValue: new Prisma.Decimal("1800"),
              minValue: null,
              maxValue: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
        },
      } as never),
    );

    const goals = await upsertGoalsByUserId("user_1", [
      {
        metric: Metric.SLEEP,
        mode: GoalMode.AT_LEAST,
        isActive: true,
        targetValue: 8,
        minValue: null,
        maxValue: null,
      },
      {
        metric: Metric.WEIGHT,
        mode: GoalMode.IN_RANGE,
        isActive: true,
        targetValue: null,
        minValue: 58,
        maxValue: 62,
      },
      {
        metric: Metric.WATER,
        mode: GoalMode.AT_LEAST,
        isActive: false,
        targetValue: 1800,
        minValue: null,
        maxValue: null,
      },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(goals.map((goal) => goal.metric)).toEqual([
      Metric.SLEEP,
      Metric.WEIGHT,
      Metric.WATER,
    ]);
    expect(goals[1]).toMatchObject({
      minValue: 58,
      maxValue: 62,
    });
  });
});
