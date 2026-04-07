import { z } from "zod";

import { getMonthStringInTimezone, shiftMonthString } from "@/lib/utils/dates";

export const MAX_HISTORY_MONTHS = 12;

export const historyMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "月份格式必须是 YYYY-MM");

export function getHistoryMonthValidationError(
  monthString: string,
  timezone: string,
) {
  const currentMonth = getMonthStringInTimezone(timezone);
  const minMonth = shiftMonthString(currentMonth, -(MAX_HISTORY_MONTHS - 1));

  if (monthString > currentMonth) {
    return "不能查看未来月份";
  }

  if (monthString < minMonth) {
    return `仅支持查看最近 ${MAX_HISTORY_MONTHS} 个月的记录`;
  }

  return null;
}

export function normalizeHistoryMonthForTimezone(
  monthString: string | null | undefined,
  timezone: string,
) {
  const currentMonth = getMonthStringInTimezone(timezone);

  if (!monthString) {
    return currentMonth;
  }

  const parsed = historyMonthSchema.safeParse(monthString);

  if (!parsed.success) {
    return currentMonth;
  }

  return getHistoryMonthValidationError(parsed.data, timezone) ? currentMonth : parsed.data;
}
