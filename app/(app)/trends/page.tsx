import { z } from "zod";

import { AppLink } from "@/components/shared/app-link";
import { TrendChart } from "@/components/charts/trend-chart";
import { RecordHistoryTable } from "@/components/trends/record-history-table";
import { requireUser } from "@/lib/auth/guards";
import { trackProductPageViewSafely } from "@/lib/services/observability-service";
import { getRecordHistoryWindowByUserId } from "@/lib/services/record-history-service";
import { getTrendOverviewByUserId } from "@/lib/services/trends-service";
import { trendDaysSchema, trendMetricSchema } from "@/lib/validations/trends";

const searchParamsSchema = z.object({
  metric: trendMetricSchema.default("sleep"),
  days: trendDaysSchema.default("30"),
});

const metricTabs = [
  { value: "sleep", label: "睡眠" },
  { value: "weight", label: "体重" },
  { value: "water", label: "饮水" },
] as const;

const dayTabs = [
  { value: "7", label: "最近 7 天" },
  { value: "30", label: "最近 30 天" },
] as const;

const insightToneStyles = {
  warning: "border-amber-200 bg-amber-50",
  info: "border-sky-200 bg-sky-50",
  success: "border-emerald-200 bg-emerald-50",
} as const;

type TrendsPageProps = {
  searchParams: Promise<{
    metric?: string;
    days?: string;
  }>;
};

export default async function TrendsPage({ searchParams }: TrendsPageProps) {
  const user = await requireUser();
  const profile = user.profile;

  if (!profile) {
    return null;
  }

  const resolvedSearchParams = await searchParams;
  const parsed = searchParamsSchema.safeParse({
    metric: resolvedSearchParams.metric ?? "sleep",
    days: resolvedSearchParams.days ?? "30",
  });

  const metric = parsed.success ? parsed.data.metric : "sleep";
  const days = parsed.success ? parsed.data.days : "30";
  const windowDays = Number(days) as 7 | 30;
  const [trend, history] = await Promise.all([
    getTrendOverviewByUserId(
      user.id,
      profile,
      metric,
      windowDays,
    ),
    getRecordHistoryWindowByUserId(
      user.id,
      profile,
      windowDays,
    ),
    trackProductPageViewSafely(user.id, "/trends", { metric, days: windowDays }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">趋势</h1>
          <p className="text-sm leading-6 text-slate-600">
            7 天或 30 天，把变化放到同一条线上。
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {metricTabs.map((tab) => (
              <AppLink
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  metric === tab.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                href={`/trends?metric=${tab.value}&days=${days}`}
                key={tab.value}
              >
                {tab.label}
              </AppLink>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dayTabs.map((tab) => (
              <AppLink
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  days === tab.value
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
                href={`/trends?metric=${metric}&days=${tab.value}`}
                key={tab.value}
              >
                {tab.label}
              </AppLink>
            ))}
            <a
              className="ml-2 inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400"
              href={`/api/export?format=csv&from=${trend.startDate}&to=${trend.endDate}`}
            >
              导出这一段
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">记录天数</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {trend.recordedDays}/{trend.days}
          </p>
          <p className="mt-2 text-sm text-slate-600">记录率 {trend.completionRate}%</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">最近值</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {trend.latestDisplay ? `${trend.latestDisplay} ${trend.unitLabel}` : "暂无"}
          </p>
          <p className="mt-2 text-sm text-slate-600">最近一次{trend.metricLabel}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">平均值</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {trend.averageDisplay ? `${trend.averageDisplay} ${trend.unitLabel}` : "暂无"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {trend.startDate} 至 {trend.endDate}
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">达标率</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {trend.attainmentRate === null ? "未设置" : `${trend.attainmentRate}%`}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {trend.goalDescription ?? "先去设置目标"}
          </p>
          {trend.goalDeviationDescription ? (
            <p className="mt-3 text-sm font-medium text-slate-900">
              {trend.goalDeviationDescription}
            </p>
          ) : null}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <article className={`rounded-3xl border p-6 shadow-sm ${insightToneStyles[trend.insight.tone]}`}>
          <p className="text-sm font-semibold text-slate-900">{trend.insight.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{trend.insight.description}</p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">和上一段比</p>
            <p className="text-sm text-slate-500">
              {trend.comparison.previousStartDate} 至 {trend.comparison.previousEndDate}
            </p>
          </div>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <dt>记录率</dt>
              <dd className="font-medium text-slate-900">
                {trend.comparison.completionRateChange > 0 ? "+" : ""}
                {trend.comparison.completionRateChange}%
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>平均变化</dt>
              <dd className="font-medium text-slate-900">
                {trend.comparison.averageDeltaDisplay ?? "变化不明显"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>达标率变化</dt>
              <dd className="font-medium text-slate-900">
                {trend.comparison.attainmentRateChange === null
                  ? "未设置目标"
                  : `${trend.comparison.attainmentRateChange > 0 ? "+" : ""}${trend.comparison.attainmentRateChange}%`}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      {trend.contextSummary ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold tracking-[0.18em] text-sky-700">
              体重线索
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {trend.contextSummary.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {trend.contextSummary.description}
              </p>
            </div>
            <div className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-slate-700 ring-1 ring-sky-100">
              <span className="font-semibold text-slate-900">
                {trend.contextSummary.taggedDays}
              </span>{" "}
              天有线索
            </div>
          </div>
          {trend.contextSummary.topContextLabels.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {trend.contextSummary.topContextLabels.map((item) => (
                <span
                  className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-sky-100"
                  key={item.label}
                >
                  {item.label} {item.count} 次
                </span>
              ))}
            </div>
          ) : (
            <AppLink
              className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              href="/today"
            >
              补今天的线索
            </AppLink>
          )}
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {trend.metricLabel}线
            </h2>
            <p className="text-sm text-slate-600">
              {trend.startDate} 至 {trend.endDate}
            </p>
          </div>
          <div className="text-sm text-slate-500">
            最低 {trend.minDisplay ? `${trend.minDisplay} ${trend.unitLabel}` : "暂无"}，最高{" "}
            {trend.maxDisplay ? `${trend.maxDisplay} ${trend.unitLabel}` : "暂无"}
          </div>
        </div>

        <div className="mt-8">
          <TrendChart trend={trend} />
        </div>
      </section>

      <RecordHistoryTable history={history} />
    </div>
  );
}
