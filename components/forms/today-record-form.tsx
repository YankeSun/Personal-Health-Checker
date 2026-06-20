"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";

import { AppLink } from "@/components/shared/app-link";
import { ReminderPanel } from "@/components/shared/reminder-panel";
import type { DailyRecordSummaryView } from "@/lib/services/daily-record-service";
import type { ReminderFeed } from "@/lib/services/reminder-service";
import { getApiErrorMessage } from "@/lib/utils/client-api";
import type { GoalView } from "@/lib/utils/goals";
import {
  ACTIVITY_LEVEL_OPTIONS,
  DIET_TAG_OPTIONS,
  ENERGY_LEVEL_OPTIONS,
  WEIGH_TIMING_OPTIONS,
  type ActivityLevel,
  type DietTag,
  type EnergyLevel,
  type RecordContextTags,
  type WeighTiming,
  countRecordContextTags,
  getDefaultRecordContextTags,
} from "@/lib/utils/record-context";
import {
  getRecordQualityWarnings,
  type RecordQualityWarning,
} from "@/lib/utils/record-quality";
import {
  getRecordCompletionSummary,
  getTodayGoalInsights,
  type TodayGoalInsight,
} from "@/lib/utils/today-record";
import {
  fromDisplaySleep,
  fromDisplayWater,
  fromDisplayWeight,
} from "@/lib/utils/units";

type TodayRecordFormProps = {
  initialValues: {
    date: string;
    dateLabel: string;
    timezone: string;
    sleepHours: string;
    weight: string;
    water: string;
    contextTags: RecordContextTags;
    weightUnit: "KG" | "LB";
    waterUnit: "ML" | "OZ";
    reminderEnabled: boolean;
    isBackfilled?: boolean;
  };
  reminderFeed: ReminderFeed;
  goals?: GoalView[];
  hasExistingRecord?: boolean;
  onboarding?: {
    title: string;
    description: string;
  };
  quickFillDefaults?: {
    sleepHours: string;
    weight: string;
    water: string;
  };
  dateControls?: {
    isToday: boolean;
    minDate: string;
    maxDate: string;
    previousDate: string | null;
    nextDate: string | null;
    recentRecords: Array<
      DailyRecordSummaryView & {
        shortLabel: string;
      }
    >;
  };
  previewMode?: boolean;
};

type FormState = {
  sleepHours: string;
  weight: string;
  water: string;
  contextTags: RecordContextTags;
};

export function TodayRecordForm({
  initialValues,
  reminderFeed,
  goals = [],
  hasExistingRecord = false,
  onboarding,
  quickFillDefaults,
  dateControls,
  previewMode = false,
}: TodayRecordFormProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [activeDate, setActiveDate] = useState(initialValues.date);
  const [form, setForm] = useState<FormState>({
    sleepHours: initialValues.sleepHours,
    weight: initialValues.weight,
    water: initialValues.water,
    contextTags: initialValues.contextTags,
  });
  const [isPending, setIsPending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [hasRecord, setHasRecord] = useState(hasExistingRecord);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedQualityWarnings, setSavedQualityWarnings] = useState<RecordQualityWarning[]>([]);
  const completion = getRecordCompletionSummary(form);
  const currentQualityWarnings = getRecordQualityWarnings({
    sleepHours: fromDisplaySleep(form.sleepHours),
    weightKg: fromDisplayWeight(form.weight, initialValues.weightUnit),
    waterMl: fromDisplayWater(form.water, initialValues.waterUnit),
  });
  const qualityWarnings =
    currentQualityWarnings.length > 0 ? currentQualityWarnings : savedQualityWarnings;
  const shouldShowOnboarding =
    Boolean(onboarding) &&
    dateControls?.isToday !== false &&
    !hasRecord &&
    !completion.hasAnyValue;
  const goalInsights = getTodayGoalInsights(form, goals, {
    weightUnit: initialValues.weightUnit,
    waterUnit: initialValues.waterUnit,
  });
  const goalInsightsByMetric = new Map(goalInsights.map((insight) => [insight.metric, insight]));
  const contextTagCount = countRecordContextTags(form.contextTags);

  const sleepQuickOptions = buildQuickOptions([
    quickFillDefaults?.sleepHours
      ? {
          label: `沿用最近 ${quickFillDefaults.sleepHours} 小时`,
          value: quickFillDefaults.sleepHours,
        }
      : null,
    { label: "6.5 小时", value: "6.5" },
    { label: "7.5 小时", value: "7.5" },
    { label: "8.0 小时", value: "8" },
  ]);
  const weightQuickOptions = buildQuickOptions([
    quickFillDefaults?.weight
      ? {
          label: `沿用最近 ${quickFillDefaults.weight} ${
            initialValues.weightUnit === "KG" ? "kg" : "lb"
          }`,
          value: quickFillDefaults.weight,
        }
      : null,
  ]);
  const waterQuickOptions = buildQuickOptions([
    quickFillDefaults?.water
      ? {
          label: `沿用最近 ${quickFillDefaults.water} ${
            initialValues.waterUnit === "ML" ? "ml" : "oz"
          }`,
          value: quickFillDefaults.water,
        }
      : null,
    {
      label: initialValues.waterUnit === "ML" ? "1500 ml" : "50 oz",
      value: initialValues.waterUnit === "ML" ? "1500" : "50",
    },
    {
      label: initialValues.waterUnit === "ML" ? "2000 ml" : "68 oz",
      value: initialValues.waterUnit === "ML" ? "2000" : "68",
    },
    {
      label: initialValues.waterUnit === "ML" ? "2500 ml" : "85 oz",
      value: initialValues.waterUnit === "ML" ? "2500" : "85",
    },
  ]);

  useEffect(() => {
    setActiveDate(initialValues.date);
    setForm({
      sleepHours: initialValues.sleepHours,
      weight: initialValues.weight,
      water: initialValues.water,
      contextTags: initialValues.contextTags,
    });
    setHasRecord(hasExistingRecord);
    setError("");
    setSuccess("");
    setSavedQualityWarnings(
      getRecordQualityWarnings({
        sleepHours: fromDisplaySleep(initialValues.sleepHours),
        weightKg: fromDisplayWeight(initialValues.weight, initialValues.weightUnit),
        waterMl: fromDisplayWater(initialValues.water, initialValues.waterUnit),
      }),
    );
  }, [hasExistingRecord, initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsPending(true);
    const nextSummary = getRecordCompletionSummary(form);

    if (previewMode) {
      setSavedQualityWarnings(currentQualityWarnings);
      setSuccess(
        nextSummary.isComplete
          ? "这一组已成形。"
          : `已更新，还差 ${nextSummary.missingMetrics.join("、")}`,
      );
      setIsPending(false);
      return;
    }

    try {
      const response = await fetch(`/api/records/${initialValues.date}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sleepHours: fromDisplaySleep(form.sleepHours),
          weightKg: fromDisplayWeight(form.weight, initialValues.weightUnit),
          waterMl: fromDisplayWater(form.water, initialValues.waterUnit),
          contextTags: form.contextTags,
        }),
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "保存失败，请稍后再试"));
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            record?: {
              isBackfilled?: boolean;
            };
            qualityWarnings?: RecordQualityWarning[];
          }
        | null;

      setHasRecord(true);
      setSavedQualityWarnings(payload?.qualityWarnings ?? currentQualityWarnings);
      setSuccess(
        nextSummary.isComplete
          ? initialValues.date === dateControls?.maxDate
            ? "今天这组已完成"
            : payload?.record?.isBackfilled
              ? "这次补录已入列"
              : "这一天已完成"
          : `已保存，还差 ${nextSummary.missingMetrics.join("、")}`,
      );
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setIsPending(false);
    }
  }

  async function handleClear() {
    setError("");
    setSuccess("");
    setIsClearing(true);

    if (previewMode) {
      setForm({
        sleepHours: "",
        weight: "",
        water: "",
        contextTags: getDefaultRecordContextTags(),
      });
      setHasRecord(false);
      setSavedQualityWarnings([]);
      setSuccess("记录已清空。");
      setIsClearing(false);
      return;
    }

    try {
      const response = await fetch(`/api/records/${initialValues.date}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "清空失败，请稍后再试"));
        return;
      }

      setForm({
        sleepHours: "",
        weight: "",
        water: "",
        contextTags: getDefaultRecordContextTags(),
      });
      setHasRecord(false);
      setSavedQualityWarnings([]);
      setSuccess("这一天已清空");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setIsClearing(false);
    }
  }

  function updateField(field: Exclude<keyof FormState, "contextTags">, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleDietTag(tag: DietTag) {
    setForm((current) => {
      const currentTags = current.contextTags.dietTags;
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((item) => item !== tag)
        : currentTags.length >= 3
          ? currentTags
          : [...currentTags, tag];

      return {
        ...current,
        contextTags: {
          ...current.contextTags,
          dietTags: nextTags,
        },
      };
    });
  }

  function updateContextTag<
    T extends Exclude<keyof RecordContextTags, "dietTags">,
  >(field: T, value: NonNullable<RecordContextTags[T]>) {
    setForm((current) => ({
      ...current,
      contextTags: {
        ...current.contextTags,
        [field]: current.contextTags[field] === value ? null : value,
      },
    }));
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            {dateControls?.isToday ? "今天落点" : "每日落点"}
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            睡眠、体重、饮水。三项到位，今天就有线索。
          </p>
        </div>

        {dateControls ? (
          <div className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-950">{initialValues.dateLabel}</p>
                <p className="mt-1 text-sm text-emerald-800">
                  时区：{initialValues.timezone}
                </p>
              </div>
              {!dateControls.isToday ? (
                <AppLink
                  className="inline-flex rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
                  href="/today"
                >
                  回到今天
                </AppLink>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                {dateControls.previousDate ? (
                  <AppLink
                    className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
                    href={`/today?date=${dateControls.previousDate}`}
                  >
                    前一天
                  </AppLink>
                ) : null}
                {dateControls.nextDate ? (
                  <AppLink
                    className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
                    href={`/today?date=${dateControls.nextDate}`}
                  >
                    后一天
                  </AppLink>
                ) : null}
              </div>
              <label className="flex items-center gap-3 text-sm text-emerald-950">
                <span className="font-medium">日期</span>
                <input
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                  type="date"
                  min={dateControls.minDate}
                  max={dateControls.maxDate}
                  value={activeDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setActiveDate(nextDate);

                    if (!nextDate) {
                      return;
                    }

                    router.push(
                      nextDate === dateControls.maxDate ? "/today" : `/today?date=${nextDate}`,
                      { scroll: false },
                    );
                  }}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
            <p className="text-sm font-medium text-emerald-950">{initialValues.dateLabel}</p>
            <p className="mt-1 text-sm text-emerald-800">
              时区：{initialValues.timezone}
            </p>
          </div>
        )}

        {!dateControls?.isToday ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
            <p className="font-medium">
              {hasRecord || initialValues.isBackfilled
                ? "这一天已标记为补录。"
                : "保存后会标记为补录。"}
            </p>
            <p className="mt-1 text-sky-800">
              趋势会保留日期，并区分当日记录与补录。
            </p>
          </div>
        ) : null}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          {shouldShowOnboarding ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-950">{onboarding?.title}</p>
              <p className="mt-1 text-sm text-emerald-800">{onboarding?.description}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                  <p className="font-medium text-slate-900">1. 先落点</p>
                  <p className="mt-1 text-xs text-slate-500">三项记下</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                  <p className="font-medium text-slate-900">2. 看概览</p>
                  <p className="mt-1 text-xs text-slate-500">状态显影</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                  <p className="font-medium text-slate-900">3. 明天继续</p>
                  <p className="mt-1 text-xs text-slate-500">变化成线</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                已完成 {completion.completedCount} / 3
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {completion.isComplete
                  ? "三项齐了，可以看概览。"
                  : completion.hasAnyValue
                    ? `还差 ${completion.missingMetrics.join("、")}`
                    : "先写下一项，剩下的稍后补齐。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill label="睡眠" active={form.sleepHours.trim() !== ""} />
              <StatusPill label="体重" active={form.weight.trim() !== ""} />
              <StatusPill label="饮水" active={form.water.trim() !== ""} />
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">睡眠（小时）</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              inputMode="decimal"
              type="number"
              step="0.1"
              min="0"
              max="24"
              value={form.sleepHours}
              onChange={(event) => updateField("sleepHours", event.target.value)}
              placeholder="例如 7.5"
            />
            {sleepQuickOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {sleepQuickOptions.map((option) => (
                  <QuickFillButton
                    key={option.label}
                    label={option.label}
                    onClick={() => updateField("sleepHours", option.value)}
                  />
                ))}
              </div>
            ) : null}
            <GoalInsightPanel insight={goalInsightsByMetric.get("SLEEP")} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              体重（{initialValues.weightUnit === "KG" ? "kg" : "lb"}）
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              inputMode="decimal"
              type="number"
              step="0.1"
              min="0"
              value={form.weight}
              onChange={(event) => updateField("weight", event.target.value)}
              placeholder={initialValues.weightUnit === "KG" ? "例如 63.5" : "例如 140"}
            />
            {weightQuickOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {weightQuickOptions.map((option) => (
                  <QuickFillButton
                    key={option.label}
                    label={option.label}
                    onClick={() => updateField("weight", option.value)}
                  />
                ))}
              </div>
            ) : null}
            <GoalInsightPanel insight={goalInsightsByMetric.get("WEIGHT")} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              饮水（{initialValues.waterUnit === "ML" ? "ml" : "oz"}）
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              inputMode="numeric"
              type="number"
              step="1"
              min="0"
              value={form.water}
              onChange={(event) => updateField("water", event.target.value)}
              placeholder={initialValues.waterUnit === "ML" ? "例如 1800" : "例如 60"}
            />
            {waterQuickOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {waterQuickOptions.map((option) => (
                  <QuickFillButton
                    key={option.label}
                    label={option.label}
                    onClick={() => updateField("water", option.value)}
                  />
                ))}
              </div>
            ) : null}
            <GoalInsightPanel insight={goalInsightsByMetric.get("WATER")} />
          </label>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">体重线索</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                给这次称重一点上下文。
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {contextTagCount} 条线索
            </span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ContextMultiTagGroup
              title="饮食状态"
              description="最多选 3 项"
              selectedValues={form.contextTags.dietTags}
              options={DIET_TAG_OPTIONS}
              onToggle={toggleDietTag}
            />
            <ContextSingleTagGroup
              title="称重时段"
              selectedValue={form.contextTags.weighTiming}
              options={WEIGH_TIMING_OPTIONS}
              onToggle={(value) => updateContextTag("weighTiming", value)}
            />
            <ContextSingleTagGroup
              title="活动量"
              selectedValue={form.contextTags.activityLevel}
              options={ACTIVITY_LEVEL_OPTIONS}
              onToggle={(value) => updateContextTag("activityLevel", value)}
            />
            <ContextSingleTagGroup
              title="精神状态"
              selectedValue={form.contextTags.energyLevel}
              options={ENERGY_LEVEL_OPTIONS}
              onToggle={(value) => updateContextTag("energyLevel", value)}
            />
          </div>
        </section>

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        ) : null}
        {qualityWarnings.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <p className="font-medium">再看一眼这条记录</p>
            <ul className="mt-2 space-y-2 text-amber-900">
              {qualityWarnings.map((warning) => (
                <li key={warning.id}>
                  <span className="font-medium">{warning.title}</span>
                  <span className="ml-2">{warning.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
            <p>{success}</p>
            {!previewMode && (
              <div className="mt-3">
                <AppLink
                  className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  href="/dashboard"
                >
                  看概览
                </AppLink>
              </div>
            )}
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-8 -mb-8 mt-6 border-t border-slate-100 bg-white/95 px-8 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={isPending || isRefreshing || isClearing || !hasRecord}
              onClick={handleClear}
            >
              {isClearing ? "清空中..." : "清空这一天"}
            </button>
            <button
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isPending || isRefreshing || isClearing}
            >
              {previewMode
                ? "更新预览"
                : isPending
                  ? "保存中..."
                  : isRefreshing
                    ? "刷新中..."
                    : completion.isComplete && !hasRecord
                      ? initialValues.date === dateControls?.maxDate
                        ? "完成今天"
                        : "完成这一天"
                      : initialValues.date === dateControls?.maxDate
                        ? "保存今天"
                        : "保存这一天"}
            </button>
          </div>
        </div>
      </form>

      <aside className="space-y-6">
        <ReminderPanel
          feed={reminderFeed}
          title={dateControls?.isToday === false ? "最近留心" : "今天留心"}
          description="只显示最值得先处理的两件事。"
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">记录口径</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>睡眠：昨晚总时长，例如 7.5 小时。</li>
            <li>体重：尽量固定时段，线条更干净。</li>
            <li>饮水：按全天累计量，晚些补也可以。</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">当前偏好</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <dt>体重单位</dt>
              <dd className="font-medium text-slate-900">
                {initialValues.weightUnit === "KG" ? "公斤 (kg)" : "磅 (lb)"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>饮水单位</dt>
              <dd className="font-medium text-slate-900">
                {initialValues.waterUnit === "ML" ? "毫升 (ml)" : "盎司 (oz)"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>站内提醒</dt>
              <dd className="font-medium text-slate-900">
                {initialValues.reminderEnabled ? "已开启" : "已关闭"}
              </dd>
            </div>
          </dl>
        </section>

        {dateControls ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">最近 14 天</h2>
            <div className="mt-4 space-y-3">
              {dateControls.recentRecords.map((record) => {
                const statusLabel = record.isComplete
                  ? "完整记录"
                  : record.hasAnyRecord
                    ? `已记录 ${record.completedMetrics}/3 项`
                    : "尚未记录";
                const toneClass = record.isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : record.hasAnyRecord
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-slate-200 bg-slate-50 text-slate-700";

                return (
                  <AppLink
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition hover:border-emerald-300 hover:bg-white ${toneClass} ${
                      record.date === initialValues.date ? "ring-2 ring-slate-900/10" : ""
                    }`}
                    href={record.date === dateControls.maxDate ? "/today" : `/today?date=${record.date}`}
                    key={record.date}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {record.date === dateControls.maxDate ? "今天" : record.shortLabel}
                      </p>
                      <p className="mt-1 text-xs opacity-80">{statusLabel}</p>
                    </div>
                    <div className="text-right text-xs opacity-80">
                      <p>睡眠 {record.sleepRecorded ? "已记" : "未记"}</p>
                      <p>体重 {record.weightRecorded ? "已记" : "未记"}</p>
                      <p>饮水 {record.waterRecorded ? "已记" : "未记"}</p>
                    </div>
                  </AppLink>
                );
              })}
            </div>
          </section>
        ) : null}
      </aside>
    </section>
  );
}

function buildQuickOptions(
  options: Array<
    | {
        label: string;
        value: string;
      }
    | null
  >,
) {
  const seen = new Set<string>();

  return options.filter((option): option is { label: string; value: string } => {
    if (!option || option.value.trim() === "" || seen.has(option.value)) {
      return false;
    }

    seen.add(option.value);
    return true;
  });
}

type ContextOption<T extends string> = {
  value: T;
  label: string;
};

function ContextMultiTagGroup({
  title,
  description,
  selectedValues,
  options,
  onToggle,
}: {
  title: string;
  description: string;
  selectedValues: DietTag[];
  options: ContextOption<DietTag>[];
  onToggle: (value: DietTag) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <span className="text-xs text-slate-500">{description}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option.value);
          const disabled = !selected && selectedValues.length >= 3;

          return (
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selected
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-900"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              disabled={disabled}
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ContextSingleTagGroup<T extends ActivityLevel | EnergyLevel | WeighTiming>({
  title,
  selectedValue,
  options,
  onToggle,
}: {
  title: string;
  selectedValue: T | null;
  options: ContextOption<T>[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValue === option.value;

          return (
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selected
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-900"
              }`}
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickFillButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${
        active
          ? "bg-emerald-100 text-emerald-900"
          : "bg-white text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {active ? "已记" : "待记"} {label}
    </span>
  );
}

function GoalInsightPanel({ insight }: { insight: TodayGoalInsight | undefined }) {
  if (!insight) {
    return null;
  }

  const toneClass =
    insight.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : insight.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-700";

  const badgeClass =
    insight.tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : insight.tone === "warning"
        ? "bg-amber-100 text-amber-800"
        : "bg-white text-slate-500 ring-1 ring-slate-200";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-current/75">
          {insight.title}
        </p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${badgeClass}`}>
          {insight.statusLabel}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6">{insight.detail}</p>
    </div>
  );
}
