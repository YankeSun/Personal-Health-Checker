import { GoalMode, Metric } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  formatGoalDeviationDescription,
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

  it("describes how far an at-least goal is from target", () => {
    expect(
      formatGoalDeviationDescription(
        Metric.SLEEP,
        {
          metric: Metric.SLEEP,
          mode: GoalMode.AT_LEAST,
          isActive: true,
          targetValue: 7.5,
          minValue: null,
          maxValue: null,
        },
        7.1,
        profile,
      ),
    ).toBe("距离目标还差 0.4 小时");
  });

  it("describes when a range goal is already inside target", () => {
    expect(
      formatGoalDeviationDescription(
        Metric.WEIGHT,
        {
          metric: Metric.WEIGHT,
          mode: GoalMode.IN_RANGE,
          isActive: true,
          targetValue: null,
          minValue: 60,
          maxValue: 63,
        },
        61.4,
        profile,
      ),
    ).toBe("当前落在目标区间内");
  });
});
