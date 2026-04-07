import { TodayRecordForm } from "@/components/forms/today-record-form";
import { requireUser } from "@/lib/auth/guards";
import {
  getDailyRecordByUserAndDate,
  getRecentDailyRecordSummariesByUserId,
} from "@/lib/services/daily-record-service";
import { getReminderFeedByUserId } from "@/lib/services/reminder-service";
import {
  formatDateLabel,
  formatShortDateLabel,
  getDateStringInTimezone,
  getEditableRecordDateBounds,
  shiftDateString,
} from "@/lib/utils/dates";
import { toDisplaySleep, toDisplayWater, toDisplayWeight } from "@/lib/utils/units";
import { normalizeRecordDateForTimezone } from "@/lib/validations/record-date";

type TodayPageProps = {
  searchParams: Promise<{
    date?: string;
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
  const [record, reminderFeed] = await Promise.all([
    getDailyRecordByUserAndDate(user.id, selectedDate),
    getReminderFeedByUserId(user.id, profile),
  ]);
  const recentRecords = await getRecentDailyRecordSummariesByUserId(
    user.id,
    selectedDate,
    14,
  );
  const isToday = selectedDate === todayDate;
  const previousDate =
    selectedDate > bounds.minDate ? shiftDateString(selectedDate, -1) : null;
  const nextDate =
    selectedDate < bounds.maxDate ? shiftDateString(selectedDate, 1) : null;

  return (
    <TodayRecordForm
      initialValues={{
        date: selectedDate,
        dateLabel: formatDateLabel(selectedDate),
        timezone: profile.timezone,
        sleepHours: toDisplaySleep(record?.sleepHours ?? null),
        weight: toDisplayWeight(record?.weightKg ?? null, profile.weightUnit),
        water: toDisplayWater(record?.waterMl ?? null, profile.waterUnit),
        weightUnit: profile.weightUnit,
        waterUnit: profile.waterUnit,
        reminderEnabled: profile.reminderEnabled,
      }}
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
