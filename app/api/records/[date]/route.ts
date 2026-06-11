import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteDailyRecordByUserAndDate,
  getDailyRecordByUserAndDate,
} from "@/lib/services/daily-record-service";
import {
  saveDailyRecordWithEvents,
  trackRecordFormStartedSafely,
} from "@/lib/services/record-save-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import { getDefaultRecordContextTags } from "@/lib/utils/record-context";
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

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser(request);

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
  await trackRecordFormStartedSafely({
    userId: user.id,
    date: parsedDate.date,
    timezone: user.profile.timezone,
    request,
  });

  return Response.json({
    record: record ?? {
      date: parsedDate.date,
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

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser(request);

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
    const { record, qualityWarnings } = await saveDailyRecordWithEvents({
      userId: user.id,
      date: parsedDate.date,
      timezone: user.profile.timezone,
      fields: body,
      request,
    });

    return Response.json({ record, qualityWarnings });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getZodErrorMessage(error), 400);
    }

    console.error("record update error", error);
    return jsonError("保存记录失败，请稍后再试", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUser(request);

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
