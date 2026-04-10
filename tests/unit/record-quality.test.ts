import { describe, expect, it } from "vitest";

import { getRecordQualityWarnings } from "@/lib/utils/record-quality";

describe("record-quality", () => {
  it("returns no warnings for typical values", () => {
    expect(
      getRecordQualityWarnings({
        sleepHours: 7.5,
        weightKg: 62.3,
        waterMl: 1800,
      }),
    ).toEqual([]);
  });

  it("returns warnings for obvious outliers", () => {
    expect(
      getRecordQualityWarnings({
        sleepHours: 2.5,
        weightKg: 28,
        waterMl: 7000,
      }).map((warning) => warning.id),
    ).toEqual(["sleep-outlier", "weight-outlier", "water-outlier"]);
  });
});
