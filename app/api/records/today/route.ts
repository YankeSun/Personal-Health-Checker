import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { getTodayRecordByUserId } from "@/lib/services/daily-record-service";
import {
  saveDailyRecordWithEvents,
  trackRecordFormStartedSafely,
} from "@/lib/services/record-save-service";
import { jsonError, getZodErrorMessage } from "@/lib/utils/api";
import { getDateStringInTimezone } from "@/lib/utils/dates";
import { getDefaultRecordContextTags } from "@/lib/utils/record-context";
import { getRecordQualityWarnings } from "@/lib/utils/record-quality";
import { dailyRecordInputSchema } from "@/lib/validations/daily-record";

export async function GET(request?: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return jsonError("未登录", 401);
  }

  if (!user.profile) {
    return jsonError("用户资料不存在", 404);
  }

  const today = getDateStringInTimezone(user.profile.timezone);
  const record = await getTodayRecordByUserId(user.id, user.profile.timezone);
  await trackRecordFormStartedSafely({
    userId: user.id,
    date: today,
    timezone: user.profile.timezone,
    request,
  });

  return Response.json({
    record: record ?? {
      date: today,
      sleepHours: null,
      weightKg: null,
      waterMl: null,
      isBackfilled: false,
      contextTags: getDefaultRecordContextTags(),
    },
    qualityWarnings: record
      ? getRecordQualityWarnings({
          sleepHours: record.sleepHours,
          weightKg: record.weightKg,
          waterMl: record.waterMl,
        })
      : [],
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return jsonError("未登录", 401);
  }

  if (!user.profile) {
    return jsonError("用户资料不存在", 404);
  }

  try {
    const body = dailyRecordInputSchema.parse(await request.json());
    const today = getDateStringInTimezone(user.profile.timezone);

    if (body.date !== today) {
      return jsonError("只能保存今天的记录", 400);
    }

    const { date, ...fields } = body;
    const { record, qualityWarnings } = await saveDailyRecordWithEvents({
      userId: user.id,
      date,
      timezone: user.profile.timezone,
      fields,
      request,
    });

    return Response.json({ record, qualityWarnings });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    console.error("today record update error", error);
    return jsonError("保存今日记录失败，请稍后再试", 500);
  }
}
