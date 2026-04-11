import { GoalMode, Metric } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  getRecordCompletionSummary,
  getTodayGoalInsights,
} from "@/lib/utils/today-record";

describe("today-record utils", () => {
  it("marks a record as complete when all three metrics are filled", () => {
    expect(
      getRecordCompletionSummary({
        sleepHours: "7.5",
        weight: "63.2",
        water: "1800",
      }),
    ).toEqual({
      completedCount: 3,
      isComplete: true,
      hasAnyValue: true,
      missingMetrics: [],
    });
  });

  it("returns the missing metric labels for partial records", () => {
    expect(
      getRecordCompletionSummary({
        sleepHours: "7.5",
        weight: "",
        water: "1800",
      }),
    ).toEqual({
      completedCount: 2,
      isComplete: false,
      hasAnyValue: true,
      missingMetrics: ["体重"],
    });
  });

  it("treats empty values as no progress", () => {
    expect(
      getRecordCompletionSummary({
        sleepHours: "",
        weight: "",
        water: "",
      }),
    ).toEqual({
      completedCount: 0,
      isComplete: false,
      hasAnyValue: false,
      missingMetrics: ["睡眠", "体重", "饮水"],
    });
  });

  it("builds neutral goal guidance before a metric is filled", () => {
    const insights = getTodayGoalInsights(
      {
        sleepHours: "",
        weight: "",
        water: "",
      },
      [
        {
          metric: Metric.SLEEP,
          mode: GoalMode.AT_LEAST,
          isActive: true,
          targetValue: 7.5,
          minValue: null,
          maxValue: null,
        },
      ],
      {
        weightUnit: "KG",
        waterUnit: "ML",
      },
    );

    expect(insights).toEqual([
      {
        metric: Metric.SLEEP,
        title: "睡眠",
        statusLabel: "今天会这样判断",
        detail: "每天睡够 7.5 小时",
        tone: "neutral",
      },
    ]);
  });

  it("describes how far today is from target while editing", () => {
    const insights = getTodayGoalInsights(
      {
        sleepHours: "7.1",
        weight: "61.4",
        water: "",
      },
      [
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
      ],
      {
        weightUnit: "KG",
        waterUnit: "ML",
      },
    );

    expect(insights).toEqual([
      {
        metric: Metric.SLEEP,
        title: "睡眠",
        statusLabel: "今天还差一点",
        detail: "距离目标还差 0.4 小时",
        tone: "warning",
      },
      {
        metric: Metric.WEIGHT,
        title: "体重",
        statusLabel: "今天已对齐目标",
        detail: "当前落在目标区间内",
        tone: "success",
      },
    ]);
  });
});
