import { prisma } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { shiftDateString } from "@/lib/utils/dates";

export const PRODUCT_EVENT_NAMES = {
  signUpCompleted: "SIGN_UP_COMPLETED",
  loginCompleted: "LOGIN_COMPLETED",
  pageView: "PAGE_VIEW",
  dailyRecordSaved: "DAILY_RECORD_SAVED",
  firstRecordSaved: "FIRST_RECORD_SAVED",
  firstCompleteRecordSaved: "FIRST_COMPLETE_RECORD_SAVED",
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
  pageViews: Array<{
    path: string;
    views: number;
    uniqueUsers: number;
  }>;
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

  const [successfulLogins, recordRows, observationEvents, pageViewRows] =
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

function roundTo(value: number, fractionDigits: number) {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}
