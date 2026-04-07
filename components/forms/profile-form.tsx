"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { getApiErrorMessage } from "@/lib/utils/client-api";

type ProfileFormProps = {
  initialValues: {
    displayName: string;
    timezone: string;
    weightUnit: "KG" | "LB";
    waterUnit: "ML" | "OZ";
    reminderEnabled: boolean;
    email: string;
  };
  previewMode?: boolean;
};

type FormState = {
  displayName: string;
  timezone: string;
  weightUnit: "KG" | "LB";
  waterUnit: "ML" | "OZ";
  reminderEnabled: boolean;
};

const timezoneOptions = [
  { value: "Asia/Shanghai", label: "Asia/Shanghai (中国标准时间)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (香港时间)" },
  { value: "UTC", label: "UTC" },
] as const;

export function ProfileForm({ initialValues, previewMode = false }: ProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    displayName: initialValues.displayName,
    timezone: initialValues.timezone,
    weightUnit: initialValues.weightUnit,
    waterUnit: initialValues.waterUnit,
    reminderEnabled: initialValues.reminderEnabled,
  });
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsPending(true);

    if (previewMode) {
      setSuccess("设置已更新。");
      setIsPending(false);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "保存失败，请稍后再试"));
        return;
      }

      setSuccess("设置已保存");
      router.refresh();
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">个人设置</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            你的昵称、时区和记录偏好会影响每天的录入方式，以及统计页面的展示口径。
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">昵称</span>
            <input
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              type="text"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              autoComplete="nickname"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">时区</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              value={form.timezone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">体重单位</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              value={form.weightUnit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  weightUnit: event.target.value as FormState["weightUnit"],
                }))
              }
            >
              <option value="KG">公斤 (kg)</option>
              <option value="LB">磅 (lb)</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">饮水单位</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
              value={form.waterUnit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  waterUnit: event.target.value as FormState["waterUnit"],
                }))
              }
            >
              <option value="ML">毫升 (ml)</option>
              <option value="OZ">盎司 (oz)</option>
            </select>
          </label>
        </div>

        <label className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <input
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            type="checkbox"
            checked={form.reminderEnabled}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reminderEnabled: event.target.checked,
              }))
            }
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-slate-800">
              开启站内提醒
            </span>
            <span className="block text-sm leading-6 text-slate-600">
              在今日记录页和仪表盘中显示缺失记录、未达标和连续打卡提示。
            </span>
          </span>
        </label>

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

        <div className="mt-6 flex items-center justify-end">
          <button
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {previewMode ? "应用设置" : isPending ? "保存中..." : "保存设置"}
          </button>
        </div>
      </form>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">当前登录邮箱</p>
          <p className="mt-2 break-all text-base font-semibold text-slate-900">
            {initialValues.email}
          </p>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
          <h2 className="text-base font-semibold text-emerald-950">这些设置会影响</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-emerald-900">
            <li>今日记录页会按你的单位显示体重和饮水输入。</li>
            <li>统计页面会按你的时区判断每天的自然日。</li>
            <li>提醒开关会控制站内提示是否展示。</li>
          </ul>
        </section>
      </aside>
    </section>
  );
}
