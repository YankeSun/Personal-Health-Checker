import { z } from "zod";

import { AppLink } from "@/components/shared/app-link";
import { TrendChart } from "@/components/charts/trend-chart";
import { RecordHistoryTable } from "@/components/trends/record-history-table";
import { requireUser } from "@/lib/auth/guards";
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
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">历史趋势</h1>
          <p className="text-sm leading-6 text-slate-600">
            查看睡眠、体重和饮水在最近 7 天或 30 天内的变化，并结合目标线理解每天的波动节奏。
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
              导出当前范围
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
          <p className="mt-2 text-sm text-slate-600">{trend.metricLabel} 最近一次记录</p>
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
            {trend.goalDescription ?? "先去设置页配置目标"}
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {trend.metricLabel}趋势图
            </h2>
            <p className="text-sm text-slate-600">
              时间范围：{trend.startDate} 至 {trend.endDate}
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
