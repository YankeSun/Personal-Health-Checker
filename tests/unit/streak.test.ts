import { describe, expect, it } from "vitest";

import { getNextStreakMilestone, getStreakMomentum } from "@/lib/utils/streak";

describe("streak utils", () => {
  it("returns the next milestone for an early streak", () => {
    expect(getNextStreakMilestone(0)).toBe(3);
    expect(getNextStreakMilestone(5)).toBe(7);
  });

  it("returns null when no milestone remains", () => {
    expect(getNextStreakMilestone(30)).toBeNull();
  });

  it("computes remaining days to the next milestone", () => {
    expect(getStreakMomentum(2)).toEqual({
      nextMilestone: 3,
      daysRemaining: 1,
    });
    expect(getStreakMomentum(8)).toEqual({
      nextMilestone: 14,
      daysRemaining: 6,
    });
  });
});
