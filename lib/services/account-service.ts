import { Prisma } from "@prisma/client";

import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { prisma } from "@/lib/db";
import { normalizeRecordContextTags } from "@/lib/utils/record-context";
import { serializeGoal } from "@/lib/utils/goals";
import { storageDateToDateString } from "@/lib/utils/dates";

function serializeDecimal(value: Prisma.Decimal | number | null) {
  return value === null ? null : Number(value);
}

export async function getAccountExportByUserId(userId: string) {
  await ensureDatabaseSchema();

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
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

  if (!user) {
    return null;
  }

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    profile: user.profile
      ? {
          displayName: user.profile.displayName,
          timezone: user.profile.timezone,
          weightUnit: user.profile.weightUnit,
          waterUnit: user.profile.waterUnit,
          reminderEnabled: user.profile.reminderEnabled,
        }
      : null,
    goals: user.goals.map((goal) => serializeGoal(goal)),
    dailyRecords: user.dailyRecords.map((record) => ({
      date: storageDateToDateString(record.date),
      isBackfilled: record.isBackfilled,
      sleepHours: serializeDecimal(record.sleepHours),
      weightKg: serializeDecimal(record.weightKg),
      waterMl: record.waterMl,
      contextTags: normalizeRecordContextTags(record.contextTags),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    wechatIdentities: user.wechatIdentities.map((identity) => ({
      appId: identity.appId,
      openid: identity.openid,
      unionid: identity.unionid,
      createdAt: identity.createdAt.toISOString(),
    })),
    productEvents: user.productEvents.map((event) => ({
      eventName: event.eventName,
      path: event.path,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function deleteUserAccountByUserId(userId: string) {
  await ensureDatabaseSchema();

  await prisma.productEvent.deleteMany({
    where: {
      userId,
    },
  });

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });
}
