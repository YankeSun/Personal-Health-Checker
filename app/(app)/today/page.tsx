import { TodayRecordForm } from "@/components/forms/today-record-form";
import { requireUser } from "@/lib/auth/guards";
import {
  getDailyRecordByUserAndDate,
  getLatestMetricDefaultsByUserId,
  getRecentDailyRecordSummariesByUserId,
} from "@/lib/services/daily-record-service";
import { getGoalsByUserId } from "@/lib/services/goals-service";
import {
  trackProductEventSafely,
  PRODUCT_EVENT_NAMES,
  trackProductPageViewSafely,
} from "@/lib/services/observability-service";
import { getReminderFeedByUserId } from "@/lib/services/reminder-service";
import {
  formatDateLabel,
  formatShortDateLabel,
  getDateStringInTimezone,
  getEditableRecordDateBounds,
  shiftDateString,
} from "@/lib/utils/dates";
import { getDefaultRecordContextTags } from "@/lib/utils/record-context";
import { toDisplaySleep, toDisplayWater, toDisplayWeight } from "@/lib/utils/units";
import { normalizeRecordDateForTimezone } from "@/lib/validations/record-date";

type TodayPageProps = {
  searchParams: Promise<{
    date?: string;
    welcome?: string;
  }>;
};

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const user = await requireUser();
  const profile = user.profile;

  if (!profile) {
    return null;
  }

  const todayDate = getDateStringInTimezone(profile.timezone);
  const resolvedSearchParams = await searchParams;
  const selectedDate = normalizeRecordDateForTimezone(
    resolvedSearchParams.date,
    profile.timezone,
  );
  const bounds = getEditableRecordDateBounds(profile.timezone);
  const isToday = selectedDate === todayDate;
  const [record, reminderFeed, recentRecords, latestDefaults, goals] = await Promise.all([
    getDailyRecordByUserAndDate(user.id, selectedDate),
    getReminderFeedByUserId(user.id, profile),
    getRecentDailyRecordSummariesByUserId(user.id, selectedDate, 14),
    getLatestMetricDefaultsByUserId(user.id, selectedDate),
    getGoalsByUserId(user.id),
    trackProductPageViewSafely(user.id, "/today", {
      selectedDate,
      isToday,
      }),
    trackProductEventSafely({
      userId: user.id,
      eventName: PRODUCT_EVENT_NAMES.recordFormStarted,
      path: isToday ? "/today" : "/history",
      metadata: {
        date: selectedDate,
        isToday,
        platform: "web",
      },
    }),
  ]);
  const previousDate =
    selectedDate > bounds.minDate ? shiftDateString(selectedDate, -1) : null;
  const nextDate =
    selectedDate < bounds.maxDate ? shiftDateString(selectedDate, 1) : null;
  const hasAnyHistory = recentRecords.some((item) => item.hasAnyRecord);
  const showWelcome = isToday && !record && (resolvedSearchParams.welcome === "1" || !hasAnyHistory);

  return (
    <TodayRecordForm
      initialValues={{
        date: selectedDate,
        dateLabel: formatDateLabel(selectedDate),
        timezone: profile.timezone,
        sleepHours: toDisplaySleep(record?.sleepHours ?? null),
        weight: toDisplayWeight(record?.weightKg ?? null, profile.weightUnit),
        water: toDisplayWater(record?.waterMl ?? null, profile.waterUnit),
        contextTags: record?.contextTags ?? getDefaultRecordContextTags(),
        weightUnit: profile.weightUnit,
        waterUnit: profile.waterUnit,
        reminderEnabled: profile.reminderEnabled,
        isBackfilled: record?.isBackfilled ?? false,
      }}
      onboarding={
        showWelcome
          ? {
              title: "从今天落点",
              description: "三项到位，第一条线索就会出现。",
            }
          : undefined
      }
      quickFillDefaults={{
        sleepHours: toDisplaySleep(latestDefaults.sleepHours),
        weight: toDisplayWeight(latestDefaults.weightKg, profile.weightUnit),
        water: toDisplayWater(latestDefaults.waterMl, profile.waterUnit),
      }}
      goals={goals}
      hasExistingRecord={Boolean(record)}
      dateControls={{
        isToday,
        minDate: bounds.minDate,
        maxDate: bounds.maxDate,
        previousDate,
        nextDate,
        recentRecords: recentRecords.map((item) => ({
          ...item,
          shortLabel: formatShortDateLabel(item.date),
        })),
      }}
      reminderFeed={reminderFeed}
    />
  );
}
