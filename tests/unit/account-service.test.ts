import { Metric, GoalMode, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import {
  deleteUserAccountByUserId,
  getAccountExportByUserId,
} from "@/lib/services/account-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    productEvent: {
      deleteMany: vi.fn(),
    },
  },
}));

describe("account-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports profile, goals, records, context tags, wechat identities, and product events", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      emailVerifiedAt: new Date("2026-04-01T00:00:00.000Z"),
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      passwordHash: "hash",
      profile: {
        id: "profile_1",
        userId: "user_1",
        displayName: "Demo",
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
        reminderEnabled: true,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      },
      goals: [
        {
          id: "goal_1",
          userId: "user_1",
          metric: Metric.WEIGHT,
          mode: GoalMode.IN_RANGE,
          targetValue: null,
          minValue: new Prisma.Decimal("60"),
          maxValue: new Prisma.Decimal("65"),
          isActive: true,
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
          updatedAt: new Date("2026-04-01T00:00:00.000Z"),
        },
      ],
      dailyRecords: [
        {
          id: "record_1",
          userId: "user_1",
          date: new Date("2026-04-02T00:00:00.000Z"),
          sleepHours: new Prisma.Decimal("7.5"),
          weightKg: new Prisma.Decimal("63.2"),
          waterMl: 1800,
          isBackfilled: false,
          contextTags: {
            dietTags: ["LIGHT"],
            activityLevel: "NORMAL",
            energyLevel: null,
            weighTiming: "MORNING",
          },
          createdAt: new Date("2026-04-02T08:00:00.000Z"),
          updatedAt: new Date("2026-04-02T08:00:00.000Z"),
        },
      ],
      wechatIdentities: [
        {
          id: "wechat_1",
          userId: "user_1",
          appId: "wx_app",
          openid: "openid_1",
          unionid: null,
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
          updatedAt: new Date("2026-04-01T00:00:00.000Z"),
        },
      ],
      productEvents: [
        {
          id: "event_1",
          userId: "user_1",
          eventName: "ALPHA_FEEDBACK_SUBMITTED",
          path: "/mp/me",
          metadata: {
            rating: 5,
            valueCue: "trend-review",
            friction: "manual-entry",
          },
          createdAt: new Date("2026-04-03T00:00:00.000Z"),
        },
      ],
    });

    const accountExport = await getAccountExportByUserId("user_1");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        id: "user_1",
      },
      include: {
        profile: true,
        goals: true,
        dailyRecords: {
          orderBy: {
            date: "asc",
          },
        },
        wechatIdentities: true,
        productEvents: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
    expect(accountExport).toMatchObject({
      user: {
        id: "user_1",
        email: "demo@example.com",
      },
      profile: {
        displayName: "Demo",
      },
      goals: [
        {
          metric: Metric.WEIGHT,
          minValue: 60,
          maxValue: 65,
        },
      ],
      dailyRecords: [
        {
          date: "2026-04-02",
          sleepHours: 7.5,
          weightKg: 63.2,
          waterMl: 1800,
          contextTags: {
            dietTags: ["LIGHT"],
            activityLevel: "NORMAL",
            weighTiming: "MORNING",
          },
        },
      ],
      wechatIdentities: [
        {
          appId: "wx_app",
          openid: "openid_1",
        },
      ],
      productEvents: [
        {
          eventName: "ALPHA_FEEDBACK_SUBMITTED",
          path: "/mp/me",
          metadata: {
            rating: 5,
            valueCue: "trend-review",
            friction: "manual-entry",
          },
          createdAt: "2026-04-03T00:00:00.000Z",
        },
      ],
    });
  });

  it("deletes product events before deleting the user account", async () => {
    await deleteUserAccountByUserId("user_1");

    expect(prisma.productEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
      },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: {
        id: "user_1",
      },
    });
  });
});
