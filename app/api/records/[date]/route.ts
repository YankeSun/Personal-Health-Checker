import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteDailyRecordByUserAndDate,
  getDailyRecordMilestonesByUserId,
  getDailyRecordByUserAndDate,
  upsertDailyRecordByUserId,
} from "@/lib/services/daily-record-service";
import {
  PRODUCT_EVENT_NAMES,
  trackProductEventSafely,
} from "@/lib/services/observability-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import { getDateStringInTimezone } from "@/lib/utils/dates";
import { getRecordQualityWarnings } from "@/lib/utils/record-quality";
import { dailyRecordFieldsSchema } from "@/lib/validations/daily-record";
import {
  getRecordDateValidationError,
  recordDateParamSchema,
} from "@/lib/validations/record-date";

type RouteContext = {
  params: Promise<{
    date: string;
  }>;
};

async function getValidatedDate(context: RouteContext, timezone: string) {
  const params = await context.params;
  const parseResult = recordDateParamSchema.safeParse(params);

  if (!parseResult.success) {
    return {
      error: getZodErrorMessage(parseResult.error),
      date: null,
    };
  }

  const validationError = getRecordDateValidationError(
    parseResult.data.date,
    timezone,
  );

  if (validationError) {
    return {
      error: validationError,
      date: null,
    };
  }

  return {
    error: null,
    date: parseResult.data.date,
  };
}

export async function GET(_: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  if (!user.profile) {
    return jsonError("用户资料不存在", 404);
  }

  const parsedDate = await getValidatedDate(context, user.profile.timezone);

  if (parsedDate.error || !parsedDate.date) {
    return jsonError(parsedDate.error ?? "日期参数不正确", 400);
  }

  const record = await getDailyRecordByUserAndDate(user.id, parsedDate.date);

  return Response.json({
    record: record ?? {
      date: parsedDate.date,
      sleepHours: null,
      weightKg: null,
      waterMl: null,
      isBackfilled: false,
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

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  if (!user.profile) {
    return jsonError("用户资料不存在", 404);
  }

  const parsedDate = await getValidatedDate(context, user.profile.timezone);

  if (parsedDate.error || !parsedDate.date) {
    return jsonError(parsedDate.error ?? "日期参数不正确", 400);
  }

  try {
    const body = dailyRecordFieldsSchema.parse(await request.json());
    const milestones = await getDailyRecordMilestonesByUserId(user.id);
    const todayDate = getDateStringInTimezone(user.profile.timezone);
    const isToday = parsedDate.date === todayDate;
    const record = await upsertDailyRecordByUserId(user.id, {
      date: parsedDate.date,
      ...body,
    }, {
      isBackfilled: !isToday,
    });
    const completedMetrics = [record.sleepHours, record.weightKg, record.waterMl].filter(
      (value) => value !== null,
    ).length;
    const qualityWarnings = getRecordQualityWarnings({
      sleepHours: record.sleepHours,
      weightKg: record.weightKg,
      waterMl: record.waterMl,
    });

    await trackProductEventSafely({
      userId: user.id,
      eventName: PRODUCT_EVENT_NAMES.dailyRecordSaved,
      path: isToday ? "/today" : "/history",
      metadata: {
        date: parsedDate.date,
        completedMetrics,
        isToday,
        isBackfilled: record.isBackfilled,
      },
    });

    if (!milestones.hasAnyRecord) {
      await trackProductEventSafely({
        userId: user.id,
        eventName: PRODUCT_EVENT_NAMES.firstRecordSaved,
        path: "/today",
        metadata: {
          date: parsedDate.date,
        },
      });
    }

    if (!milestones.hasCompleteRecord && completedMetrics === 3) {
      await trackProductEventSafely({
        userId: user.id,
        eventName: PRODUCT_EVENT_NAMES.firstCompleteRecordSaved,
        path: "/today",
        metadata: {
          date: parsedDate.date,
        },
      });
    }

    return Response.json({ record, qualityWarnings });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    console.error("record update error", error);
    return jsonError("保存记录失败，请稍后再试", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  if (!user.profile) {
    return jsonError("用户资料不存在", 404);
  }

  const parsedDate = await getValidatedDate(context, user.profile.timezone);

  if (parsedDate.error || !parsedDate.date) {
    return jsonError(parsedDate.error ?? "日期参数不正确", 400);
  }

  try {
    const result = await deleteDailyRecordByUserAndDate(user.id, parsedDate.date);
    return Response.json(result);
  } catch (error) {
    console.error("record delete error", error);
    return jsonError("清空记录失败，请稍后再试", 500);
  }
}
