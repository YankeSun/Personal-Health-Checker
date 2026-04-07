export function getDateStringInTimezone(
  timezone: string,
  date = new Date(),
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function getMonthStringInTimezone(
  timezone: string,
  date = new Date(),
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
}

export function dateStringToStorageDate(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

export function monthStringToStorageDate(monthString: string) {
  return new Date(`${monthString}-01T00:00:00.000Z`);
}

export function storageDateToDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

export function formatShortDateLabel(dateString: string) {
  const [, month, day] = dateString.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function formatMonthLabel(monthString: string) {
  const date = monthStringToStorageDate(monthString);

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(date);
}

export function shiftDateString(dateString: string, offsetDays: number) {
  const date = dateStringToStorageDate(dateString);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return storageDateToDateString(date);
}

export function shiftMonthString(monthString: string, offsetMonths: number) {
  const date = monthStringToStorageDate(monthString);
  date.setUTCMonth(date.getUTCMonth() + offsetMonths);
  return date.toISOString().slice(0, 7);
}

export function getDateRange(dateString: string, days: number) {
  return Array.from({ length: days }, (_, index) =>
    shiftDateString(dateString, -(days - 1) + index),
  );
}

export function getMonthBounds(monthString: string) {
  const startDate = `${monthString}-01`;
  const date = monthStringToStorageDate(monthString);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);

  return {
    startDate,
    endDate: storageDateToDateString(date),
  };
}

export function getMonthDates(monthString: string) {
  const { startDate, endDate } = getMonthBounds(monthString);
  const dates: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = shiftDateString(cursor, 1);
  }

  return dates;
}

export function getMonthCalendarGrid(monthString: string) {
  const monthDates = getMonthDates(monthString);
  const firstDate = dateStringToStorageDate(monthDates[0]);
  const lastDate = dateStringToStorageDate(monthDates[monthDates.length - 1]);
  const startOffset = (firstDate.getUTCDay() + 6) % 7;
  const endOffset = 6 - ((lastDate.getUTCDay() + 6) % 7);
  const gridStart = shiftDateString(monthDates[0], -startOffset);
  const gridEnd = shiftDateString(monthDates[monthDates.length - 1], endOffset);
  const dates: string[] = [];
  let cursor = gridStart;

  while (cursor <= gridEnd) {
    dates.push(cursor);
    cursor = shiftDateString(cursor, 1);
  }

  return dates;
}

export const MAX_RECORD_LOOKBACK_DAYS = 365;

export function getEditableRecordDateBounds(
  timezone: string,
  maxDays = MAX_RECORD_LOOKBACK_DAYS,
) {
  const maxDate = getDateStringInTimezone(timezone);
  const minDate = shiftDateString(maxDate, -(maxDays - 1));

  return {
    minDate,
    maxDate,
  };
}

export function isDateStringWithinBounds(
  dateString: string,
  bounds: {
    minDate: string;
    maxDate: string;
  },
) {
  return dateString >= bounds.minDate && dateString <= bounds.maxDate;
}
