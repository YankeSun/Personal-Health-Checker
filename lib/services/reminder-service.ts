import { GoalMode, Metric, WaterUnit, WeightUnit } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getGoalByMetric, getGoalsByUserId } from "@/lib/services/goals-service";
import { dateStringToStorageDate, getDateRange, getDateStringInTimezone } from "@/lib/utils/dates";
import { formatGoalShortLabel } from "@/lib/utils/goal-copy";
import { GoalView, METRIC_ORDER } from "@/lib/utils/goals";
import { getStreakMomentum } from "@/lib/utils/streak";

type ReminderProfile = {
  timezone: string;
  reminderEnabled: boolean;
  weightUnit: WeightUnit;
  waterUnit: WaterUnit;
};

type ReminderTone = "warning" | "info" | "success";

export type ReminderItem = {
  id: string;
  tone: ReminderTone;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
};

export type ReminderFeed = {
  enabled: boolean;
  todayDate: string;
  reminders: ReminderItem[];
};

type RecordLike = {
  sleepHours: number | null;
  weightKg: number | null;
  waterMl: number | null;
};

const metricLabels = {
  [Metric.SLEEP]: "睡眠",
  [Metric.WEIGHT]: "体重",
  [Metric.WATER]: "饮水",
} as const;

const metricQueryParams = {
  [Metric.SLEEP]: "sleep",
  [Metric.WEIGHT]: "weight",
  [Metric.WATER]: "water",
} as const;

function getMetricValue(metric: Metric, record: RecordLike | null) {
  if (!record) {
    return null;
  }

  if (metric === Metric.SLEEP) {
    return record.sleepHours;
  }

  if (metric === Metric.WEIGHT) {
    return record.weightKg;
  }

  return record.waterMl;
}

function isCompleteRecord(record: RecordLike | null) {
  if (!record) {
    return false;
  }

  return (
    record.sleepHours !== null &&
    record.weightKg !== null &&
    record.waterMl !== null
  );
}

function calculateStreak(todayDate: string, recordMap: Map<string, RecordLike>) {
  let streak = 0;

  for (const date of [...getDateRange(todayDate, 30)].reverse()) {
    if (date === todayDate || streak > 0) {
      if (!isCompleteRecord(recordMap.get(date) ?? null)) {
        break;
      }

      streak += 1;
    }
  }

  return streak;
}

function calculateMetricMissingStreak(
  metric: Metric,
  dates: string[],
  recordMap: Map<string, RecordLike>,
) {
  let streak = 0;
  let latestDate: string | null = null;

  for (const date of [...dates].reverse()) {
    const value = getMetricValue(metric, recordMap.get(date) ?? null);

    if (value === null) {
      streak += 1;
      latestDate ??= date;
      continue;
    }

    break;
  }

  return {
    streak,
    latestDate,
  };
}

function calculateGoalMissStreak(
  goal: GoalView,
  dates: string[],
  recordMap: Map<string, RecordLike>,
) {
  let streak = 0;

  for (const date of [...dates].reverse()) {
    const value = getMetricValue(goal.metric, recordMap.get(date) ?? null);
    const result = evaluateGoal(value, goal);

    if (result === false) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

function evaluateGoal(value: number | null, goal: GoalView) {
  if (!goal.isActive || value === null) {
    return null;
  }

  if (goal.mode === GoalMode.IN_RANGE) {
    if (goal.minValue === null || goal.maxValue === null) {
      return null;
    }

    return value >= goal.minValue && value <= goal.maxValue;
  }

  if (goal.targetValue === null) {
    return null;
  }

  if (goal.mode === GoalMode.AT_MOST) {
    return value <= goal.targetValue;
  }

  return value >= goal.targetValue;
}

function listMissingMetrics(record: RecordLike | null) {
  return METRIC_ORDER.filter((metric) => getMetricValue(metric, record) === null);
}

function getLastRecordedDate(dates: string[], recordMap: Map<string, RecordLike>) {
  return [...dates]
    .reverse()
    .find((date) => {
      const record = recordMap.get(date) ?? null;
      return listMissingMetrics(record).length < METRIC_ORDER.length;
    }) ?? null;
}

function getDateGapInDays(fromDate: string, toDate: string) {
  const from = dateStringToStorageDate(fromDate).getTime();
  const to = dateStringToStorageDate(toDate).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export async function getReminderFeedByUserId(
  userId: string,
  profile: ReminderProfile,
): Promise<ReminderFeed> {
  const todayDate = getDateStringInTimezone(profile.timezone);

  if (!profile.reminderEnabled) {
    return {
      enabled: false,
      todayDate,
      reminders: [],
    };
  }

  const dates = getDateRange(todayDate, 30);
  const recent7Days = dates.slice(-7);

  const [records, goals] = await Promise.all([
    prisma.dailyRecord.findMany({
      where: {
        userId,
        date: {
          gte: dateStringToStorageDate(dates[0]),
          lte: dateStringToStorageDate(todayDate),
        },
      },
      orderBy: {
        date: "asc",
      },
    }),
    getGoalsByUserId(userId),
  ]);

  const recordMap = new Map(
    records.map((record) => [
      record.date.toISOString().slice(0, 10),
      {
        sleepHours: record.sleepHours === null ? null : Number(record.sleepHours),
        weightKg: record.weightKg === null ? null : Number(record.weightKg),
        waterMl: record.waterMl,
      } satisfies RecordLike,
    ]),
  );

  const reminders: ReminderItem[] = [];
  const todayRecord = recordMap.get(todayDate) ?? null;
  const missingMetrics = listMissingMetrics(todayRecord);
  const lastRecordedDate = getLastRecordedDate(dates, recordMap);
  const inactivityDays =
    lastRecordedDate === null ? null : getDateGapInDays(lastRecordedDate, todayDate);

  if (missingMetrics.length === METRIC_ORDER.length) {
    if (inactivityDays !== null && inactivityDays >= 4) {
      reminders.push({
        id: "inactive-return",
        tone: "warning",
        title: `已经 ${inactivityDays} 天没有回来记录`,
        description: "先把今天这组记下来，再决定要不要回补前几天。重新开始比一次补齐更重要。",
        actionHref: "/today",
        actionLabel: "先记今天",
      });
    } else if (inactivityDays === 1) {
      reminders.push({
        id: "missing-all-today-soft",
        tone: "info",
        title: "今天还没开始，但节奏还在",
        description: "先把今天这组补上，连续记录就不会断掉。",
        actionHref: "/today",
        actionLabel: "继续今天这组",
      });
    } else {
      reminders.push({
        id: "missing-all-today",
        tone: "warning",
        title: "今天还没有开始记录",
        description: "先补上睡眠、体重和饮水，后面的趋势、达标率和连续记录才会更有参考意义。",
        actionHref: "/today",
        actionLabel: "去补录今天的数据",
      });
    }
  } else if (missingMetrics.length > 0) {
    reminders.push({
      id: "missing-some-today",
      tone: "warning",
      title: `今天还有 ${missingMetrics.length} 项待补录`,
      description: `还差 ${missingMetrics.map((metric) => metricLabels[metric]).join("、")}，补齐后仪表盘的完成度和趋势会更完整。`,
      actionHref: "/today",
      actionLabel: "继续补录",
    });
  }

  const metricMissingStreaks = METRIC_ORDER.map((metric) => ({
    metric,
    ...calculateMetricMissingStreak(metric, recent7Days, recordMap),
  }))
    .filter((item) => item.streak >= 2 && item.latestDate !== null)
    .sort((left, right) => right.streak - left.streak);

  const longestMissingMetric = metricMissingStreaks[0];

  if (longestMissingMetric) {
    reminders.push({
      id: `missing-streak-${longestMissingMetric.metric.toLowerCase()}`,
      tone: "warning",
      title: `${metricLabels[longestMissingMetric.metric]}已经连续 ${longestMissingMetric.streak} 天没有记录`,
      description: `连续缺失会让趋势判断出现断层。先把 ${metricLabels[longestMissingMetric.metric]} 补起来，再看近 7 天波动会更准确。`,
      actionHref:
        longestMissingMetric.latestDate === todayDate
          ? "/today"
          : `/today?date=${longestMissingMetric.latestDate}`,
      actionLabel: "去补录这项数据",
    });
  }

  const activeGoals = goals.filter((goal) => goal.isActive);

  if (activeGoals.length === 0) {
    reminders.push({
      id: "goals-not-configured",
      tone: "info",
      title: "还没有设置健康目标",
      description: "设置睡眠、体重和饮水目标后，仪表盘和趋势页才会开始计算达标率。",
      actionHref: "/settings",
      actionLabel: "去设置目标",
    });
  } else if (activeGoals.length < METRIC_ORDER.length) {
    reminders.push({
      id: "goals-partial",
      tone: "info",
      title: `还有 ${METRIC_ORDER.length - activeGoals.length} 项未设置目标`,
      description: "目标越完整，你看到的达标率和提醒提示就越准确。",
      actionHref: "/settings",
      actionLabel: "继续完善目标",
    });
  }

  const weakestGoal = activeGoals
    .map((goal) => {
      const metDays = recent7Days.filter((date) => {
        const value = getMetricValue(goal.metric, recordMap.get(date) ?? null);
        return evaluateGoal(value, goal) === true;
      }).length;

      return {
        goal,
        metDays,
        rate: Math.round((metDays / recent7Days.length) * 1000) / 10,
      };
    })
    .sort((left, right) => left.rate - right.rate)[0];

  if (weakestGoal && weakestGoal.rate < 50) {
    reminders.push({
      id: `goal-underperforming-${weakestGoal.goal.metric.toLowerCase()}`,
      tone: "warning",
      title: `最近 7 天${metricLabels[weakestGoal.goal.metric]}达标率偏低`,
      description: `最近 7 天只有 ${weakestGoal.metDays}/7 天达到“${formatGoalShortLabel(
        weakestGoal.goal.metric,
        weakestGoal.goal,
        profile,
      )}”，可以先把目标调到更容易坚持的区间，或者先保证每天补录。`,
      actionHref: `/trends?metric=${metricQueryParams[weakestGoal.goal.metric]}&days=7`,
      actionLabel: "查看趋势",
    });
  }

  const goalMissStreaks = activeGoals
    .map((goal) => ({
      goal,
      streak: calculateGoalMissStreak(goal, recent7Days, recordMap),
    }))
    .filter((item) => item.streak >= 3)
    .sort((left, right) => right.streak - left.streak);

  const longestGoalMiss = goalMissStreaks[0];

  if (longestGoalMiss) {
    reminders.push({
      id: `goal-miss-streak-${longestGoalMiss.goal.metric.toLowerCase()}`,
      tone: "info",
      title: `${metricLabels[longestGoalMiss.goal.metric]}已经连续 ${longestGoalMiss.streak} 天未达标`,
      description: `最近几天这项指标都没有达到“${formatGoalShortLabel(
        longestGoalMiss.goal.metric,
        longestGoalMiss.goal,
        profile,
      )}”。可以先把目标调得更容易坚持，或者优先观察这项指标的日常节奏。`,
      actionHref: `/trends?metric=${metricQueryParams[longestGoalMiss.goal.metric]}&days=7`,
      actionLabel: "查看最近 7 天趋势",
    });
  }

  const streakDays = calculateStreak(todayDate, recordMap);
  const streakMomentum = getStreakMomentum(streakDays);

  if (streakDays > 0 && streakDays < 3 && isCompleteRecord(todayRecord)) {
    reminders.push({
      id: "streak-building",
      tone: "success",
      title: "今天这组已经完成",
      description: `再坚持 ${streakMomentum.daysRemaining} 天，就会形成 ${streakMomentum.nextMilestone} 天连续记录。`,
      actionHref: "/dashboard",
      actionLabel: "看连续记录进展",
    });
  } else if (streakDays >= 3) {
    reminders.push({
      id: "consistency-streak",
      tone: "success",
      title: `你已经连续完整记录 ${streakDays} 天`,
      description:
        streakMomentum.nextMilestone === null
          ? "继续保持现在的节奏，连续数据会让趋势判断更稳定，也更容易看出行为变化带来的影响。"
          : `继续保持现在的节奏，再坚持 ${streakMomentum.daysRemaining} 天，就到 ${streakMomentum.nextMilestone} 天连续记录。`,
      actionHref: "/dashboard",
      actionLabel: "查看仪表盘",
    });
  }

  if (reminders.length < 3 && activeGoals.length > 0) {
    const bestGoal = activeGoals
      .map((goal) => {
        const metDays = recent7Days.filter((date) => {
          const value = getMetricValue(goal.metric, recordMap.get(date) ?? null);
          return evaluateGoal(value, goal) === true;
        }).length;

        return {
          goal,
          metDays,
          rate: Math.round((metDays / recent7Days.length) * 1000) / 10,
        };
      })
      .sort((left, right) => right.rate - left.rate)[0];

    if (bestGoal && bestGoal.rate >= 70) {
      reminders.push({
        id: `weekly-highpoint-${bestGoal.goal.metric.toLowerCase()}`,
        tone: "success",
        title: `最近 7 天最稳定的是${metricLabels[bestGoal.goal.metric]}`,
        description: `${bestGoal.metDays}/7 天达到“${formatGoalShortLabel(
          bestGoal.goal.metric,
          bestGoal.goal,
          profile,
        )}”。这是你当前最容易保持的一项。`,
        actionHref: `/trends?metric=${metricQueryParams[bestGoal.goal.metric]}&days=7`,
        actionLabel: "查看这项趋势",
      });
    }
  }

  const getReminderPriority = (reminder: ReminderItem): number => {
    const id = reminder.id;
    if (id === "inactive-return" || id === "missing-all-today-soft" || id === "missing-all-today") return 1;
    if (id === "missing-some-today") return 2;
    if (id.startsWith("missing-streak-")) return 3;
    if (id === "goal-underperforming-sleep" || id === "goal-underperforming-weight" || id === "goal-underperforming-water") return 4;
    if (id.startsWith("goal-miss-streak-")) return 4;
    if (id === "goals-not-configured" || id === "goals-partial") return 5;
    if (id === "streak-building" || id === "consistency-streak" || id.startsWith("weekly-highpoint-")) return 6;
    return 99;
  };

  const sortedReminders = [...reminders].sort((a, b) => getReminderPriority(a) - getReminderPriority(b));

  return {
    enabled: true,
    todayDate,
    reminders: sortedReminders.slice(0, 2),
  };
}
