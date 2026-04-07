import { z } from "zod";

import {
  getEditableRecordDateBounds,
  isDateStringWithinBounds,
  MAX_RECORD_LOOKBACK_DAYS,
} from "@/lib/utils/dates";
import { dailyRecordDateSchema } from "@/lib/validations/daily-record";

export const recordDateParamSchema = z.object({
  date: dailyRecordDateSchema,
});

export function getRecordDateValidationError(
  dateString: string,
  timezone: string,
) {
  const bounds = getEditableRecordDateBounds(timezone);

  if (dateString > bounds.maxDate) {
    return "不能记录未来日期";
  }

  if (!isDateStringWithinBounds(dateString, bounds)) {
    return `仅支持管理最近 ${MAX_RECORD_LOOKBACK_DAYS} 天的记录`;
  }

  return null;
}

export function normalizeRecordDateForTimezone(
  dateString: string | null | undefined,
  timezone: string,
) {
  const bounds = getEditableRecordDateBounds(timezone);

  if (!dateString) {
    return bounds.maxDate;
  }

  const parsed = recordDateParamSchema.safeParse({
    date: dateString,
  });

  if (!parsed.success) {
    return bounds.maxDate;
  }

  return isDateStringWithinBounds(parsed.data.date, bounds) ? parsed.data.date : bounds.maxDate;
}
