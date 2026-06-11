import { prisma } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { shiftDateString } from "@/lib/utils/dates";
import { countRecordContextTags } from "@/lib/utils/record-context";

export const PRODUCT_EVENT_NAMES = {
  signUpCompleted: "SIGN_UP_COMPLETED",
  loginCompleted: "LOGIN_COMPLETED",
  wechatLoginCompleted: "WECHAT_LOGIN_COMPLETED",
  pageView: "PAGE_VIEW",
  dailyRecordSaved: "DAILY_RECORD_SAVED",
  firstRecordSaved: "FIRST_RECORD_SAVED",
  firstCompleteRecordSaved: "FIRST_COMPLETE_RECORD_SAVED",
  contextTagsSaved: "CONTEXT_TAGS_SAVED",
  payIntentShown: "PAY_INTENT_SHOWN",
  payIntentClicked: "PAY_INTENT_CLICKED",
  alphaFeedbackSubmitted: "ALPHA_FEEDBACK_SUBMITTED",
} as const;

type ProductEventName =
  (typeof PRODUCT_EVENT_NAMES)[keyof typeof PRODUCT_EVENT_NAMES];

type ProductEventInput = {
  userId?: string | null;
  eventName: ProductEventName;
  path?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt?: Date;
};

export type ObservationSnapshot = {
  days: number;
  generatedAt: string;
  signUps: number;
  verifiedUsers: number;
  verifiedRate: number;
  successfulLogins: number;
  usersWithFirstRecord: number;
  firstRecordRate: number;
  nextDayReturnUsers: number;
  nextDayReturnRate: number;
  averageRecordedDaysInFirst7Days: number;
  payIntentImpressions: number;
  payIntentShownUsers: number;
  payIntentClicks: number;
  payIntentUsers: number;
  payIntentRate: number;
  payIntentClickThroughRate: number;
  pageViews: Array<{
    path: string;
    views: number;
    uniqueUsers: number;
  }>;
};

export type MiniProgramAlphaSnapshot = {
  days: number;
  generatedAt: string;
  alphaUsers: number;
  newAlphaUsers: number;
  usersWithAnyRecord: number;
  usersWithCompleteRecord: number;
  firstCompleteRecordRate: number;
  nextDayReturnUsers: number;
  nextDayReturnRate: number;
  averageRecordedDaysInFirst7Days: number;
  recordedDays: number;
  weightFilledDays: number;
  weightFillRate: number;
  contextTagFilledDays: number;
  contextTagFillRate: number;
  dashboardViewUsers: number;
  dashboardViewRate: number;
  trendViewUsers: number;
  trendViewRate: number;
  payIntentShownUsers: number;
  payIntentExposureRate: number;
  payIntentUsers: number;
  payIntentRate: number;
  payIntentClickThroughRate: number;
  feedbackUsers: number;
  feedbackRate: number;
  averageFeedbackRating: number;
  topValueCues: Array<{
    value: string;
    count: number;
  }>;
  topFrictions: Array<{
    value: string;
    count: number;
  }>;
  decision: "needs_data" | "continue_candidate" | "hold_and_improve";
  gates: Array<{
    label: string;
    actual: number;
    target: number;
    passed: boolean;
  }>;
  notes: string[];
};

export async function trackProductEvent({
  userId,
  eventName,
  path,
  metadata,
  createdAt,
}: ProductEventInput) {
  await ensureDatabaseSchema();

  return prisma.productEvent.create({
    data: {
      userId: userId ?? null,
      eventName,
      path: path ?? null,
      metadata: metadata ?? undefined,
      createdAt,
    },
  });
}

export async function trackProductEventSafely(input: ProductEventInput) {
  try {
    await trackProductEvent(input);
  } catch (error) {
    console.error("product event track error", error);
  }
}

export async function trackProductPageViewSafely(
  userId: string,
  path: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  await trackProductEventSafely({
    userId,
    eventName: PRODUCT_EVENT_NAMES.pageView,
    path,
    metadata,
  });
}

export async function getObservationSnapshot(days = 30) {
  await ensureDatabaseSchema();

  const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  const signUps = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      createdAt: true,
      emailVerifiedAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const userIds = signUps.map((user) => user.id);
  const earliestSignupAt = signUps[0]?.createdAt ?? startDate;

  const [
    successfulLogins,
    recordRows,
    observationEvents,
    payIntentShownRows,
    payIntentRows,
    pageViewRows,
  ] =
    await Promise.all([
      prisma.productEvent.count({
        where: {
          eventName: PRODUCT_EVENT_NAMES.loginCompleted,
          createdAt: {
            gte: startDate,
          },
        },
      }),
      userIds.length
        ? prisma.dailyRecord.findMany({
            where: {
              userId: {
                in: userIds,
              },
            },
            select: {
              userId: true,
              date: true,
            },
            orderBy: {
              date: "asc",
            },
          })
        : Promise.resolve([]),
      userIds.length
        ? prisma.productEvent.findMany({
            where: {
              userId: {
                in: userIds,
              },
              createdAt: {
                gte: earliestSignupAt,
              },
              eventName: {
                in: [
                  PRODUCT_EVENT_NAMES.pageView,
                  PRODUCT_EVENT_NAMES.loginCompleted,
                  PRODUCT_EVENT_NAMES.dailyRecordSaved,
                  PRODUCT_EVENT_NAMES.firstRecordSaved,
                  PRODUCT_EVENT_NAMES.firstCompleteRecordSaved,
                  PRODUCT_EVENT_NAMES.contextTagsSaved,
                  PRODUCT_EVENT_NAMES.payIntentShown,
                  PRODUCT_EVENT_NAMES.payIntentClicked,
                ],
              },
            },
            select: {
              userId: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      prisma.productEvent.findMany({
        where: {
          eventName: PRODUCT_EVENT_NAMES.payIntentShown,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          userId: true,
        },
      }),
      prisma.productEvent.findMany({
        where: {
          eventName: PRODUCT_EVENT_NAMES.payIntentClicked,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          userId: true,
        },
      }),
      prisma.productEvent.findMany({
        where: {
          eventName: PRODUCT_EVENT_NAMES.pageView,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          userId: true,
          path: true,
        },
      }),
    ]);

  const recordMap = new Map<string, Set<string>>();

  for (const row of recordRows) {
    const dates = recordMap.get(row.userId) ?? new Set<string>();
    dates.add(row.date.toISOString().slice(0, 10));
    recordMap.set(row.userId, dates);
  }

  const usersWithFirstRecord = signUps.filter((user) => {
    const dates = recordMap.get(user.id);
    return Boolean(dates && dates.size > 0);
  }).length;

  const nextDayReturnUsers = signUps.filter((user) => {
    const nextDay = shiftDateString(user.createdAt.toISOString().slice(0, 10), 1);

    return observationEvents.some(
      (event) =>
        event.userId === user.id &&
        event.createdAt.toISOString().slice(0, 10) === nextDay,
    );
  }).length;

  const averageRecordedDaysInFirst7Days =
    signUps.length === 0
      ? 0
      : roundTo(
          signUps.reduce((total, user) => {
            const dates = recordMap.get(user.id) ?? new Set<string>();
            const signupDate = user.createdAt.toISOString().slice(0, 10);
            const seventhDay = shiftDateString(signupDate, 6);
            const recordedDays = [...dates].filter(
              (date) => date >= signupDate && date <= seventhDay,
            ).length;
            return total + recordedDays;
          }, 0) / signUps.length,
          2,
        );
  const payIntentUserIds = new Set(
    payIntentRows
      .map((event) => event.userId)
      .filter((userId): userId is string => Boolean(userId)),
  );
  const payIntentShownUserIds = new Set(
    payIntentShownRows
      .map((event) => event.userId)
      .filter((userId): userId is string => Boolean(userId)),
  );
  const payIntentClickThroughUserIds = new Set(
    [...payIntentUserIds].filter((userId) => payIntentShownUserIds.has(userId)),
  );

  const pageViewMap = new Map<
    string,
    {
      views: number;
      uniqueUsers: Set<string>;
    }
  >();

  for (const pageView of pageViewRows) {
    if (!pageView.path) {
      continue;
    }

    const current = pageViewMap.get(pageView.path) ?? {
      views: 0,
      uniqueUsers: new Set<string>(),
    };
    current.views += 1;

    if (pageView.userId) {
      current.uniqueUsers.add(pageView.userId);
    }

    pageViewMap.set(pageView.path, current);
  }

  return {
    days,
    generatedAt: new Date().toISOString(),
    signUps: signUps.length,
    verifiedUsers: signUps.filter((user) => Boolean(user.emailVerifiedAt)).length,
    verifiedRate:
      signUps.length === 0
        ? 0
        : roundTo(
            (signUps.filter((user) => Boolean(user.emailVerifiedAt)).length /
              signUps.length) *
              100,
            1,
          ),
    successfulLogins,
    usersWithFirstRecord,
    firstRecordRate:
      signUps.length === 0 ? 0 : roundTo((usersWithFirstRecord / signUps.length) * 100, 1),
    nextDayReturnUsers,
    nextDayReturnRate:
      signUps.length === 0 ? 0 : roundTo((nextDayReturnUsers / signUps.length) * 100, 1),
    averageRecordedDaysInFirst7Days,
    payIntentImpressions: payIntentShownRows.length,
    payIntentShownUsers: payIntentShownUserIds.size,
    payIntentClicks: payIntentRows.length,
    payIntentUsers: payIntentUserIds.size,
    payIntentRate:
      signUps.length === 0 ? 0 : roundTo((payIntentUserIds.size / signUps.length) * 100, 1),
    payIntentClickThroughRate:
      payIntentShownUserIds.size === 0
        ? 0
        : roundTo((payIntentClickThroughUserIds.size / payIntentShownUserIds.size) * 100, 1),
    pageViews: [...pageViewMap.entries()]
      .map(([path, value]) => ({
        path,
        views: value.views,
        uniqueUsers: value.uniqueUsers.size,
      }))
      .sort((left, right) => right.views - left.views)
      .slice(0, 10),
  } satisfies ObservationSnapshot;
}

type EventRow = {
  userId: string | null;
  eventName: string;
  path: string | null;
  metadata: unknown;
  createdAt: Date;
};

function getMetadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return (metadata as Record<string, unknown>)[key] ?? null;
}

function isWechatMiniProgramEvent(event: EventRow) {
  return (
    event.eventName === PRODUCT_EVENT_NAMES.wechatLoginCompleted ||
    getMetadataValue(event.metadata, "platform") === "wechat_mp"
  );
}

function uniqueUserIds(events: EventRow[]) {
  return new Set(
    events
      .map((event) => event.userId)
      .filter((userId): userId is string => Boolean(userId)),
  );
}

export async function getMiniProgramAlphaSnapshot(days = 30) {
  await ensureDatabaseSchema();

  const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  const events = (await prisma.productEvent.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
      eventName: {
        in: [
          PRODUCT_EVENT_NAMES.wechatLoginCompleted,
          PRODUCT_EVENT_NAMES.pageView,
          PRODUCT_EVENT_NAMES.dailyRecordSaved,
          PRODUCT_EVENT_NAMES.firstRecordSaved,
          PRODUCT_EVENT_NAMES.firstCompleteRecordSaved,
          PRODUCT_EVENT_NAMES.contextTagsSaved,
          PRODUCT_EVENT_NAMES.payIntentShown,
          PRODUCT_EVENT_NAMES.payIntentClicked,
          PRODUCT_EVENT_NAMES.alphaFeedbackSubmitted,
        ],
      },
    },
    select: {
      userId: true,
      eventName: true,
      path: true,
      metadata: true,
      createdAt: true,
    },
  })) as EventRow[];
  const miniProgramEvents = events.filter(isWechatMiniProgramEvent);
  const loginEvents = miniProgramEvents.filter(
    (event) => event.eventName === PRODUCT_EVENT_NAMES.wechatLoginCompleted,
  );
  const alphaUserIds = uniqueUserIds(loginEvents);
  const alphaUserIdList = [...alphaUserIds];
  const firstLoginDateByUser = new Map<string, string>();

  for (const event of loginEvents) {
    if (!event.userId) {
      continue;
    }

    const date = event.createdAt.toISOString().slice(0, 10);
    const existing = firstLoginDateByUser.get(event.userId);

    if (!existing || date < existing) {
      firstLoginDateByUser.set(event.userId, date);
    }
  }

  const newAlphaUsers = uniqueUserIds(
    loginEvents.filter((event) => getMetadataValue(event.metadata, "isNewUser") === true),
  ).size;
  const records = alphaUserIdList.length
    ? await prisma.dailyRecord.findMany({
        where: {
          userId: {
            in: alphaUserIdList,
          },
          date: {
            gte: startDate,
          },
        },
        select: {
          userId: true,
          date: true,
          sleepHours: true,
          weightKg: true,
          waterMl: true,
          contextTags: true,
        },
        orderBy: {
          date: "asc",
        },
      })
    : [];
  const recordDatesByUser = new Map<string, Set<string>>();
  const usersWithCompleteRecord = new Set<string>();
  let weightFilledDays = 0;
  let contextTagFilledDays = 0;

  for (const record of records) {
    const date = record.date.toISOString().slice(0, 10);
    const dates = recordDatesByUser.get(record.userId) ?? new Set<string>();
    dates.add(date);
    recordDatesByUser.set(record.userId, dates);

    if (record.sleepHours !== null && record.weightKg !== null && record.waterMl !== null) {
      usersWithCompleteRecord.add(record.userId);
    }

    if (record.weightKg !== null) {
      weightFilledDays += 1;
    }

    if (countRecordContextTags(record.contextTags) > 0) {
      contextTagFilledDays += 1;
    }
  }

  const nextDayReturnUsers = alphaUserIdList.filter((userId) => {
    const firstLoginDate = firstLoginDateByUser.get(userId);

    if (!firstLoginDate) {
      return false;
    }

    const nextDay = shiftDateString(firstLoginDate, 1);
    return miniProgramEvents.some(
      (event) =>
        event.userId === userId &&
        event.createdAt.toISOString().slice(0, 10) === nextDay,
    );
  }).length;
  const averageRecordedDaysInFirst7Days =
    alphaUserIdList.length === 0
      ? 0
      : roundTo(
          alphaUserIdList.reduce((total, userId) => {
            const firstLoginDate = firstLoginDateByUser.get(userId);

            if (!firstLoginDate) {
              return total;
            }

            const seventhDay = shiftDateString(firstLoginDate, 6);
            const dates = recordDatesByUser.get(userId) ?? new Set<string>();
            const recordedDays = [...dates].filter(
              (date) => date >= firstLoginDate && date <= seventhDay,
            ).length;
            return total + recordedDays;
          }, 0) / alphaUserIdList.length,
          2,
        );
  const dashboardViewUsers = uniqueUserIds(
    miniProgramEvents.filter(
      (event) => event.eventName === PRODUCT_EVENT_NAMES.pageView && event.path === "/dashboard",
    ),
  ).size;
  const trendViewUsers = uniqueUserIds(
    miniProgramEvents.filter(
      (event) =>
        event.eventName === PRODUCT_EVENT_NAMES.pageView &&
        Boolean(event.path?.startsWith("/trends")),
    ),
  ).size;
  const payIntentUsers = uniqueUserIds(
    miniProgramEvents.filter(
      (event) => event.eventName === PRODUCT_EVENT_NAMES.payIntentClicked,
    ),
  ).size;
  const payIntentShownUsers = uniqueUserIds(
    miniProgramEvents.filter(
      (event) => event.eventName === PRODUCT_EVENT_NAMES.payIntentShown,
    ),
  ).size;
  const payIntentClickThroughUsers = uniqueUserIds(
    miniProgramEvents.filter(
      (event) =>
        event.eventName === PRODUCT_EVENT_NAMES.payIntentClicked &&
        Boolean(event.userId) &&
        miniProgramEvents.some(
          (shownEvent) =>
            shownEvent.eventName === PRODUCT_EVENT_NAMES.payIntentShown &&
            shownEvent.userId === event.userId,
        ),
    ),
  ).size;
  const feedbackEvents = miniProgramEvents.filter(
    (event) => event.eventName === PRODUCT_EVENT_NAMES.alphaFeedbackSubmitted,
  );
  const feedbackUsers = uniqueUserIds(feedbackEvents).size;
  const feedbackRatings = feedbackEvents
    .map((event) => getMetadataValue(event.metadata, "rating"))
    .filter((rating): rating is number => typeof rating === "number");
  const averageFeedbackRating =
    feedbackRatings.length === 0
      ? 0
      : roundTo(
          feedbackRatings.reduce((total, rating) => total + rating, 0) /
            feedbackRatings.length,
          2,
        );
  const alphaUsers = alphaUserIds.size;
  const recordedDays = records.length;
  const gates = [
    {
      label: "次日回访率",
      actual: alphaUsers === 0 ? 0 : roundTo((nextDayReturnUsers / alphaUsers) * 100, 1),
      target: 25,
      passed: alphaUsers > 0 && nextDayReturnUsers / alphaUsers >= 0.25,
    },
    {
      label: "7 日内平均记录天数",
      actual: averageRecordedDaysInFirst7Days,
      target: 3,
      passed: averageRecordedDaysInFirst7Days >= 3,
    },
    {
      label: "体重填写率",
      actual: recordedDays === 0 ? 0 : roundTo((weightFilledDays / recordedDays) * 100, 1),
      target: 50,
      passed: recordedDays > 0 && weightFilledDays / recordedDays >= 0.5,
    },
    {
      label: "上下文标签填写率",
      actual: recordedDays === 0 ? 0 : roundTo((contextTagFilledDays / recordedDays) * 100, 1),
      target: 40,
      passed: recordedDays > 0 && contextTagFilledDays / recordedDays >= 0.4,
    },
    {
      label: "报告入口曝光率",
      actual: alphaUsers === 0 ? 0 : roundTo((payIntentShownUsers / alphaUsers) * 100, 1),
      target: 80,
      passed: alphaUsers > 0 && payIntentShownUsers / alphaUsers >= 0.8,
    },
    {
      label: "付费意愿点击率",
      actual: alphaUsers === 0 ? 0 : roundTo((payIntentUsers / alphaUsers) * 100, 1),
      target: 5,
      passed: alphaUsers > 0 && payIntentUsers / alphaUsers >= 0.05,
    },
    {
      label: "付费意愿点击/曝光转化率",
      actual:
        payIntentShownUsers === 0
          ? 0
          : roundTo((payIntentClickThroughUsers / payIntentShownUsers) * 100, 1),
      target: 5,
      passed: payIntentShownUsers > 0 && payIntentClickThroughUsers / payIntentShownUsers >= 0.05,
    },
    {
      label: "反馈提交率",
      actual: alphaUsers === 0 ? 0 : roundTo((feedbackUsers / alphaUsers) * 100, 1),
      target: 30,
      passed: alphaUsers > 0 && feedbackUsers / alphaUsers >= 0.3,
    },
  ];
  const decision =
    alphaUsers === 0
      ? "needs_data"
      : gates.every((gate) => gate.passed)
        ? "continue_candidate"
        : "hold_and_improve";
  const notes = [
    "该报告只基于 ProductEvent 和 DailyRecord，不包含访谈反馈。",
    "若判定为 continue_candidate，仍需结合反馈文本判断用户能否复述产品价值。",
    "mock 登录数据会污染真实 alpha 指标，正式测试前请清理或使用独立环境。",
  ];

  return {
    days,
    generatedAt: new Date().toISOString(),
    alphaUsers,
    newAlphaUsers,
    usersWithAnyRecord: recordDatesByUser.size,
    usersWithCompleteRecord: usersWithCompleteRecord.size,
    firstCompleteRecordRate:
      alphaUsers === 0 ? 0 : roundTo((usersWithCompleteRecord.size / alphaUsers) * 100, 1),
    nextDayReturnUsers,
    nextDayReturnRate: gates[0].actual,
    averageRecordedDaysInFirst7Days,
    recordedDays,
    weightFilledDays,
    weightFillRate: gates[2].actual,
    contextTagFilledDays,
    contextTagFillRate: gates[3].actual,
    dashboardViewUsers,
    dashboardViewRate: alphaUsers === 0 ? 0 : roundTo((dashboardViewUsers / alphaUsers) * 100, 1),
    trendViewUsers,
    trendViewRate: alphaUsers === 0 ? 0 : roundTo((trendViewUsers / alphaUsers) * 100, 1),
    payIntentShownUsers,
    payIntentExposureRate: gates[4].actual,
    payIntentUsers,
    payIntentRate: gates[5].actual,
    payIntentClickThroughRate: gates[6].actual,
    feedbackUsers,
    feedbackRate: gates[7].actual,
    averageFeedbackRating,
    topValueCues: countMetadataValues(feedbackEvents, "valueCue"),
    topFrictions: countMetadataValues(feedbackEvents, "friction"),
    decision,
    gates,
    notes,
  } satisfies MiniProgramAlphaSnapshot;
}

function countMetadataValues(events: EventRow[], key: string) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const value = getMetadataValue(event.metadata, key);

    if (typeof value !== "string" || !value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      count,
    }))
    .sort((left, right) => right.count - left.count);
}

function roundTo(value: number, fractionDigits: number) {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}
