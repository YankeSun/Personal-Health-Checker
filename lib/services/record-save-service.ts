import {
  getDailyRecordMilestonesByUserId,
  upsertDailyRecordByUserId,
} from "@/lib/services/daily-record-service";
import {
  PRODUCT_EVENT_NAMES,
  trackProductEventSafely,
} from "@/lib/services/observability-service";
import { getDateStringInTimezone } from "@/lib/utils/dates";
import { countRecordContextTags } from "@/lib/utils/record-context";
import { getRecordQualityWarnings } from "@/lib/utils/record-quality";
import { getRequestPlatform } from "@/lib/utils/request-platform";
import type { DailyRecordFieldsInput } from "@/lib/validations/daily-record";

type SaveDailyRecordWithEventsInput = {
  userId: string;
  date: string;
  timezone: string;
  fields: DailyRecordFieldsInput;
  request: Request;
};

function getRecordEventMetadata({
  date,
  fields,
  isToday,
  request,
}: {
  date: string;
  fields: DailyRecordFieldsInput;
  isToday: boolean;
  request?: Request;
}) {
  const contextTagCount = countRecordContextTags(fields.contextTags);

  return {
    date,
    completedMetrics: [
      fields.sleepHours,
      fields.weightKg,
      fields.waterMl,
    ].filter((value) => value !== null).length,
    isToday,
    contextTagCount,
    hasContextTags: contextTagCount > 0,
    platform: getRequestPlatform(request),
  };
}

export async function trackRecordFormStartedSafely({
  userId,
  date,
  timezone,
  request,
}: {
  userId: string;
  date: string;
  timezone: string;
  request?: Request;
}) {
  const isToday = date === getDateStringInTimezone(timezone);

  await trackProductEventSafely({
    userId,
    eventName: PRODUCT_EVENT_NAMES.recordFormStarted,
    path: isToday ? "/today" : "/history",
    metadata: {
      date,
      isToday,
      platform: getRequestPlatform(request),
    },
  });
}

export async function trackRecordSaveAttemptedSafely({
  userId,
  date,
  timezone,
  fields,
  request,
}: SaveDailyRecordWithEventsInput) {
  const isToday = date === getDateStringInTimezone(timezone);

  await trackProductEventSafely({
    userId,
    eventName: PRODUCT_EVENT_NAMES.recordSaveAttempted,
    path: isToday ? "/today" : "/history",
    metadata: getRecordEventMetadata({
      date,
      fields,
      isToday,
      request,
    }),
  });
}

export async function saveDailyRecordWithEvents({
  userId,
  date,
  timezone,
  fields,
  request,
}: SaveDailyRecordWithEventsInput) {
  const milestones = await getDailyRecordMilestonesByUserId(userId);
  const todayDate = getDateStringInTimezone(timezone);
  const isToday = date === todayDate;
  const platform = getRequestPlatform(request);
  await trackRecordSaveAttemptedSafely({
    userId,
    date,
    timezone,
    fields,
    request,
  });
  const record = await upsertDailyRecordByUserId(
    userId,
    {
      date,
      ...fields,
    },
    {
      isBackfilled: !isToday,
    },
  );
  const completedMetrics = [
    record.sleepHours,
    record.weightKg,
    record.waterMl,
  ].filter((value) => value !== null).length;
  const qualityWarnings = getRecordQualityWarnings({
    sleepHours: record.sleepHours,
    weightKg: record.weightKg,
    waterMl: record.waterMl,
  });
  const contextTagCount = countRecordContextTags(record.contextTags);
  const path = isToday ? "/today" : "/history";

  await trackProductEventSafely({
    userId,
    eventName: PRODUCT_EVENT_NAMES.dailyRecordSaved,
    path,
    metadata: {
      date,
      completedMetrics,
      isToday,
      isBackfilled: record.isBackfilled,
      contextTagCount,
      hasContextTags: contextTagCount > 0,
      platform,
    },
  });

  if (contextTagCount > 0) {
    await trackProductEventSafely({
      userId,
      eventName: PRODUCT_EVENT_NAMES.contextTagsSaved,
      path,
      metadata: {
        date,
        contextTagCount,
        isToday,
        platform,
      },
    });
  }

  if (!milestones.hasAnyRecord) {
    await trackProductEventSafely({
      userId,
      eventName: PRODUCT_EVENT_NAMES.firstRecordSaved,
      path: "/today",
      metadata: {
        date,
        platform,
      },
    });
  }

  if (!milestones.hasCompleteRecord && completedMetrics === 3) {
    await trackProductEventSafely({
      userId,
      eventName: PRODUCT_EVENT_NAMES.firstCompleteRecordSaved,
      path: "/today",
      metadata: {
        date,
        platform,
      },
    });
  }

  return {
    record,
    qualityWarnings,
  };
}
