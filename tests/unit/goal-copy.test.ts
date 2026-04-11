import { GoalMode, Metric } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  formatGoalRuleDescription,
  formatGoalShortLabel,
} from "@/lib/utils/goal-copy";

describe("goal-copy", () => {
  const profile = {
    weightUnit: "KG" as const,
    waterUnit: "ML" as const,
  };

  it("builds a behavior-oriented short label for at-least goals", () => {
    expect(
      formatGoalShortLabel(
        Metric.SLEEP,
        {
          metric: Metric.SLEEP,
          mode: GoalMode.AT_LEAST,
          isActive: true,
          targetValue: 7.5,
          minValue: null,
          maxValue: null,
        },
        profile,
      ),
    ).toBe("每天睡够 7.5 小时");
  });

  it("builds a rule description for range goals", () => {
    expect(
      formatGoalRuleDescription(
        Metric.WEIGHT,
        {
          metric: Metric.WEIGHT,
          mode: GoalMode.IN_RANGE,
          isActive: true,
          targetValue: null,
          minValue: 60,
          maxValue: 63,
        },
        profile,
      ),
    ).toBe("体重记录落在 60 - 63 kg 之间时，会算作当日达标。");
  });
});
