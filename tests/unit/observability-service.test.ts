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
    });
    expect(snapshot.pageViews[0]).toEqual({
      path: "/today",
      views: 2,
      uniqueUsers: 2,
    });

    vi.useRealTimers();
  });
});
