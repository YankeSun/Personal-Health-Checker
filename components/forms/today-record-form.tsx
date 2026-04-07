"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";

import { AppLink } from "@/components/shared/app-link";
import { ReminderPanel } from "@/components/shared/reminder-panel";
import type { DailyRecordSummaryView } from "@/lib/services/daily-record-service";
import type { ReminderFeed } from "@/lib/services/reminder-service";
import { getApiErrorMessage } from "@/lib/utils/client-api";
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
    weightUnit: "KG" | "LB";
    waterUnit: "ML" | "OZ";
    reminderEnabled: boolean;
  };
  reminderFeed: ReminderFeed;
  hasExistingRecord?: boolean;
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
};

export function TodayRecordForm({
  initialValues,
  reminderFeed,
  hasExistingRecord = false,
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
  });
  const [isPending, setIsPending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [hasRecord, setHasRecord] = useState(hasExistingRecord);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setActiveDate(initialValues.date);
    setForm({
      sleepHours: initialValues.sleepHours,
      weight: initialValues.weight,
      water: initialValues.water,
    });
    setHasRecord(hasExistingRecord);
    setError("");
    setSuccess("");
  }, [hasExistingRecord, initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsPending(true);

    if (previewMode) {
      setSuccess("记录已更新。");
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
        }),
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "保存失败，请稍后再试"));
        return;
      }

      setHasRecord(true);
      setSuccess(initialValues.date === dateControls?.maxDate ? "今日记录已保存" : "该日记录已保存");
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
      });
      setHasRecord(false);
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
      });
      setHasRecord(false);
      setSuccess("该日记录已清空");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            {dateControls?.isToday ? "今日记录" : "每日记录"}
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            记录这一天的睡眠、体重和饮水，让仪表盘与趋势图持续反映你最近一段时间的身体节律。
          </p>
        </div>

        {dateControls ? (
          <div className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-950">{initialValues.dateLabel}</p>
                <p className="mt-1 text-sm text-emerald-800">
                  统计时区：{initialValues.timezone}
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
                <span className="font-medium">选择日期</span>
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
              统计时区：{initialValues.timezone}
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">睡眠时长（小时）</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              inputMode="decimal"
              type="number"
              step="0.1"
              min="0"
              max="24"
              value={form.sleepHours}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sleepHours: event.target.value,
                }))
              }
              placeholder="例如 7.5"
            />
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
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  weight: event.target.value,
                }))
              }
              placeholder={initialValues.weightUnit === "KG" ? "例如 63.5" : "例如 140"}
            />
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
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  water: event.target.value,
                }))
              }
              placeholder={initialValues.waterUnit === "ML" ? "例如 1800" : "例如 60"}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isPending || isRefreshing || isClearing || !hasRecord}
            onClick={handleClear}
          >
            {isClearing ? "清空中..." : "清空该日记录"}
          </button>
          <button
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isPending || isRefreshing || isClearing}
          >
            {previewMode
              ? "更新当前视图"
              : isPending
                ? "保存中..."
                : isRefreshing
                  ? "刷新中..."
                  : "保存今日记录"}
          </button>
        </div>
      </form>

      <aside className="space-y-6">
        <ReminderPanel
          feed={reminderFeed}
          title={dateControls?.isToday === false ? "最近的提醒" : "今天的提醒"}
          description="这里会优先提示最近哪项记录缺失最多、哪项目标最值得先关注。"
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">填写建议</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>睡眠建议填写昨晚总睡眠时长，例如 7.5 小时。</li>
            <li>体重使用早晨固定时段测量，趋势会更稳定。</li>
            <li>饮水可以按全天累计量填写，晚些再回来补录也可以。</li>
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
            <h2 className="text-base font-semibold text-slate-900">最近 14 天记录</h2>
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
