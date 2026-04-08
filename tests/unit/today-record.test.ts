import { describe, expect, it } from "vitest";

import { getRecordCompletionSummary } from "@/lib/utils/today-record";

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
});
