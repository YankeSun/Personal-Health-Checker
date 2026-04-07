import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteDailyRecordByUserAndDate,
  getDailyRecordByUserAndDate,
  upsertDailyRecordByUserId,
} from "@/lib/services/daily-record-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
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
    },
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
    const record = await upsertDailyRecordByUserId(user.id, {
      date: parsedDate.date,
      ...body,
    });

    return Response.json({ record });
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
