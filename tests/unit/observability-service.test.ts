import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensureDatabaseSchema } = vi.hoisted(() => ({
  ensureDatabaseSchema: vi.fn(),
}));

vi.mock("@/lib/db/ensure-schema", () => ({
  ensureDatabaseSchema,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    productEvent: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    dailyRecord: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  PRODUCT_EVENT_NAMES,
  getMiniProgramAlphaSnapshot,
  getObservationSnapshot,
  trackProductEvent,
} from "@/lib/services/observability-service";

describe("observability-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks one product event", async () => {
    vi.mocked(prisma.productEvent.create).mockResolvedValue({
      id: "event_1",
    } as never);

    await trackProductEvent({
      userId: "user_1",
      eventName: PRODUCT_EVENT_NAMES.loginCompleted,
      path: "/login",
      metadata: {
        source: "form",
      },
    });

    expect(ensureDatabaseSchema).toHaveBeenCalled();
    expect(prisma.productEvent.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        eventName: PRODUCT_EVENT_NAMES.loginCompleted,
        path: "/login",
        metadata: {
          source: "form",
        },
        createdAt: undefined,
      },
    });
  });

  it("builds an observation snapshot from events and records", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T08:00:00.000Z"));

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "user_1",
        createdAt: new Date("2026-04-06T09:00:00.000Z"),
        emailVerifiedAt: new Date("2026-04-06T10:00:00.000Z"),
      },
      {
        id: "user_2",
        createdAt: new Date("2026-04-07T09:00:00.000Z"),
        emailVerifiedAt: null,
      },
    ] as never);
    vi.mocked(prisma.productEvent.count).mockResolvedValue(5);
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        userId: "user_1",
        date: new Date("2026-04-06T00:00:00.000Z"),
      },
      {
        userId: "user_1",
        date: new Date("2026-04-07T00:00:00.000Z"),
      },
      {
        userId: "user_2",
        date: new Date("2026-04-07T00:00:00.000Z"),
      },
    ] as never);
    vi.mocked(prisma.productEvent.findMany)
      .mockResolvedValueOnce([
        {
          userId: "user_1",
          createdAt: new Date("2026-04-07T10:00:00.000Z"),
        },
        {
          userId: "user_2",
          createdAt: new Date("2026-04-08T08:00:00.000Z"),
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          userId: "user_1",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          userId: "user_1",
          path: "/today",
        },
        {
          userId: "user_2",
          path: "/today",
        },
        {
          userId: "user_1",
          path: "/dashboard",
        },
      ] as never);

    const snapshot = await getObservationSnapshot(7);

    expect(snapshot).toMatchObject({
      days: 7,
      signUps: 2,
      verifiedUsers: 1,
      verifiedRate: 50,
      successfulLogins: 5,
      usersWithFirstRecord: 2,
      firstRecordRate: 100,
      nextDayReturnUsers: 2,
      nextDayReturnRate: 100,
      averageRecordedDaysInFirst7Days: 1.5,
      payIntentClicks: 1,
      payIntentUsers: 1,
      payIntentRate: 50,
    });
    expect(snapshot.pageViews[0]).toEqual({
      path: "/today",
      views: 2,
      uniqueUsers: 2,
    });

    vi.useRealTimers();
  });

  it("builds a mini program alpha snapshot with decision gates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T08:00:00.000Z"));

    vi.mocked(prisma.productEvent.findMany).mockResolvedValue([
      {
        userId: "user_1",
        eventName: PRODUCT_EVENT_NAMES.wechatLoginCompleted,
        path: "/api/mp/auth/wechat-login",
        metadata: {
          platform: "wechat_mp",
          isNewUser: true,
        },
        createdAt: new Date("2026-04-01T08:00:00.000Z"),
      },
      {
        userId: "user_1",
        eventName: PRODUCT_EVENT_NAMES.dailyRecordSaved,
        path: "/today",
        metadata: {
          platform: "wechat_mp",
        },
        createdAt: new Date("2026-04-02T08:00:00.000Z"),
      },
      {
        userId: "user_1",
        eventName: PRODUCT_EVENT_NAMES.pageView,
        path: "/dashboard",
        metadata: {
          platform: "wechat_mp",
        },
        createdAt: new Date("2026-04-02T08:10:00.000Z"),
      },
      {
        userId: "user_1",
        eventName: PRODUCT_EVENT_NAMES.pageView,
        path: "/trends",
        metadata: {
          platform: "wechat_mp",
        },
        createdAt: new Date("2026-04-02T08:20:00.000Z"),
      },
      {
        userId: "user_1",
        eventName: PRODUCT_EVENT_NAMES.payIntentClicked,
        path: "wechat_mp/me",
        metadata: {
          platform: "wechat_mp",
        },
        createdAt: new Date("2026-04-02T08:30:00.000Z"),
      },
    ] as never);
    vi.mocked(prisma.dailyRecord.findMany).mockResolvedValue([
      {
        userId: "user_1",
        date: new Date("2026-04-01T00:00:00.000Z"),
        sleepHours: 7.5,
        weightKg: 68.4,
        waterMl: 1800,
        contextTags: {
          dietTags: ["NORMAL"],
          activityLevel: "NORMAL",
          energyLevel: "GOOD",
          weighTiming: "MORNING",
        },
      },
      {
        userId: "user_1",
        date: new Date("2026-04-02T00:00:00.000Z"),
        sleepHours: 7.2,
        weightKg: 68.1,
        waterMl: 1600,
        contextTags: {
          dietTags: ["LIGHT"],
        },
      },
      {
        userId: "user_1",
        date: new Date("2026-04-03T00:00:00.000Z"),
        sleepHours: 7.1,
        weightKg: 67.9,
        waterMl: 1700,
        contextTags: {
          activityLevel: "HIGH",
        },
      },
    ] as never);

    const snapshot = await getMiniProgramAlphaSnapshot(30);

    expect(snapshot).toMatchObject({
      alphaUsers: 1,
      newAlphaUsers: 1,
      usersWithAnyRecord: 1,
      usersWithCompleteRecord: 1,
      firstCompleteRecordRate: 100,
      nextDayReturnUsers: 1,
      nextDayReturnRate: 100,
      averageRecordedDaysInFirst7Days: 3,
      recordedDays: 3,
      weightFilledDays: 3,
      weightFillRate: 100,
      contextTagFilledDays: 3,
      contextTagFillRate: 100,
      dashboardViewUsers: 1,
      dashboardViewRate: 100,
      trendViewUsers: 1,
      trendViewRate: 100,
      payIntentUsers: 1,
      payIntentRate: 100,
      decision: "continue_candidate",
    });
    expect(snapshot.gates.every((gate) => gate.passed)).toBe(true);

    vi.useRealTimers();
  });
});
