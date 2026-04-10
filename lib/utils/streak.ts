const STREAK_MILESTONES = [3, 7, 14, 30] as const;

export function getNextStreakMilestone(streakDays: number) {
  return STREAK_MILESTONES.find((milestone) => milestone > streakDays) ?? null;
}

export function getStreakMomentum(streakDays: number) {
  const nextMilestone = getNextStreakMilestone(streakDays);

  return {
    nextMilestone,
    daysRemaining:
      nextMilestone === null ? 0 : Math.max(nextMilestone - streakDays, 0),
  };
}
