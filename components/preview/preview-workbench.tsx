import { AppLink } from "@/components/shared/app-link";
import { DashboardOverviewPanel } from "@/components/dashboard/dashboard-overview";
import { GoalsForm } from "@/components/forms/goals-form";
import { ProfileForm } from "@/components/forms/profile-form";
import { TodayRecordForm } from "@/components/forms/today-record-form";
import { TrendChart } from "@/components/charts/trend-chart";
import {
  getPreviewTrend,
  previewDashboardOverview,
  previewGoalsValues,
  previewProfileValues,
  previewReminderFeed,
  previewTodayValues,
} from "@/lib/demo/preview-data";
import type { TrendDaysParam, TrendMetricParam } from "@/lib/validations/trends";

type PreviewScreen = "dashboard" | "today" | "trends" | "settings";

type PreviewWorkbenchProps = {
  screen: PreviewScreen;
  metric: TrendMetricParam;
  days: TrendDaysParam;
};

const screenTabs: Array<{ value: PreviewScreen; label: string; note: string }> = [
  { value: "dashboard", label: "仪表盘", note: "状态总览" },
  { value: "today", label: "今日记录", note: "输入三项数据" },
  { value: "trends", label: "历史趋势", note: "趋势与目标" },
  { value: "settings", label: "设置与目标", note: "偏好与单位" },
];

const trendMetricTabs = [
  { value: "sleep", label: "睡眠" },
  { value: "weight", label: "体重" },
  { value: "water", label: "饮水" },
] as const;

const trendDayTabs = [
  { value: "7", label: "最近 7 天" },
  { value: "30", label: "最近 30 天" },
] as const;

function PreviewTrendsPanel({
  metric,
  days,
}: {
  metric: TrendMetricParam;
  days: TrendDaysParam;
}) {
  const trend = getPreviewTrend(metric, days);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-stone-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900 [font-family:var(--font-display)]">
            历史趋势
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            在同一张图里对照最近值、平均值和目标线，快速判断变化是稳定、偏离还是正在回到区间内。
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {trendMetricTabs.map((tab) => (
              <AppLink
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  metric === tab.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                href={`/experience?screen=trends&metric=${tab.value}&days=${days}`}
                key={tab.value}
              >
                {tab.label}
              </AppLink>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {trendDayTabs.map((tab) => (
              <AppLink
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  days === tab.value
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
                href={`/experience?screen=trends&metric=${metric}&days=${tab.value}`}
                key={tab.value}
              >
                {tab.label}
              </AppLink>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">记录天数</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {trend.recordedDays}/{trend.days}
          </p>
          <p className="mt-2 text-sm text-slate-600">记录率 {trend.completionRate}%</p>
        </article>
        <article className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">最近值</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {trend.latestDisplay ? `${trend.latestDisplay} ${trend.unitLabel}` : "暂无"}
          </p>
          <p className="mt-2 text-sm text-slate-600">{trend.metricLabel} 最近一次记录</p>
        </article>
        <article className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">平均值</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {trend.averageDisplay ? `${trend.averageDisplay} ${trend.unitLabel}` : "暂无"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {trend.startDate} 至 {trend.endDate}
          </p>
        </article>
        <article className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">达标率</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {trend.attainmentRate === null ? "未设置" : `${trend.attainmentRate}%`}
          </p>
          <p className="mt-2 text-sm text-slate-600">{trend.goalDescription}</p>
        </article>
      </section>

      <section className="rounded-[32px] border border-stone-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 [font-family:var(--font-display)]">
              {trend.metricLabel}趋势图
            </h3>
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
    </div>
  );
}

export function PreviewWorkbench({ screen, metric, days }: PreviewWorkbenchProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f6f2_0%,#eef7f2_42%,#f7f6f2_100%)] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/78 px-5 py-4 shadow-[0_14px_60px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Health Tracker
            </p>
            <p className="text-sm text-slate-700">睡眠、体重、饮水，稳定记录。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <AppLink
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400"
              href="/"
            >
              返回首页
            </AppLink>
            <AppLink
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(5,150,105,0.28)] transition hover:bg-emerald-500"
              href="/login"
            >
              登录账号 →
            </AppLink>
          </div>
        </section>

        <section className="overflow-hidden rounded-[40px] border border-emerald-200/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_32%),linear-gradient(135deg,#fcfbf7_0%,#f1f7f3_56%,#eef5ff_100%)] p-8 shadow-[0_32px_120px_rgba(15,23,42,0.12)] lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-emerald-300/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
                Personal Wellness
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-5xl leading-tight text-slate-950 [font-family:var(--font-display)] sm:text-6xl">
                  把健康记录
                  <br />
                  变成有节奏的
                  <br />
                  每日观察
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-700">
                  从今天的记录到一周、一月的趋势，这里用同一套页面语言串起睡眠、体重和饮水三项核心指标，让每天的状态变化变得更容易理解。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <AppLink
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] transition hover:bg-slate-800"
                  href="/register"
                >
                  创建账号 →
                </AppLink>
                <AppLink
                  className="rounded-full border border-slate-300 bg-white/92 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
                  href="/login"
                >
                  直接登录
                </AppLink>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <article className="rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Core Records
                  </p>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    Daily
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: "睡眠",
                      value: "7.5h",
                      tone: "bg-slate-900 text-white",
                    },
                    {
                      label: "体重",
                      value: "62.4",
                      tone: "bg-white text-slate-900 border border-slate-200",
                    },
                    {
                      label: "饮水",
                      value: "1800ml",
                      tone: "bg-emerald-600 text-white",
                    },
                  ].map((item) => (
                    <div
                      className="flex items-center justify-between rounded-[22px] border border-white/80 bg-white/88 px-4 py-3"
                      key={item.label}
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.12em] ${item.tone}`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Rhythm Loop
                  </p>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    Flow
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  {[
                    { step: "01", label: "记录", accent: "bg-slate-900 text-white" },
                    { step: "02", label: "观察", accent: "bg-emerald-600 text-white" },
                    { step: "03", label: "调整", accent: "bg-white text-slate-900 border border-slate-200" },
                  ].map((item, index) => (
                    <div className="flex flex-1 items-center gap-3" key={item.step}>
                      <div className="min-w-0 flex-1 rounded-[24px] border border-white/80 bg-white/88 px-4 py-4 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {item.step}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.label}</p>
                        <div className="mt-3 flex justify-center">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.12em] ${item.accent}`}>
                            Active
                          </span>
                        </div>
                      </div>
                      {index < 2 ? (
                        <div className="hidden h-px flex-1 bg-gradient-to-r from-emerald-200 via-slate-200 to-transparent lg:block" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {screenTabs.map((tab) => (
            <AppLink
              className={`group rounded-[30px] border p-5 transition ${
                screen === tab.value
                  ? "border-slate-900 bg-slate-900 text-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
                  : "border-emerald-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,253,245,0.92)_100%)] text-slate-900 shadow-[0_18px_48px_rgba(16,185,129,0.12)] hover:-translate-y-1 hover:border-emerald-400 hover:shadow-[0_24px_70px_rgba(16,185,129,0.18)]"
              }`}
              href={`/experience?screen=${tab.value}${tab.value === "trends" ? `&metric=${metric}&days=${days}` : ""}`}
              key={tab.value}
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  screen === tab.value
                    ? "bg-white/12 text-slate-200"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {screen === tab.value ? "Current" : "Open"}
                </div>
                <span
                  className={`text-lg transition ${
                    screen === tab.value
                      ? "text-white/80"
                      : "text-emerald-700 group-hover:translate-x-1"
                  }`}
                >
                  →
                </span>
              </div>
              <p className="mt-4 text-base font-semibold">{tab.label}</p>
              <p className={`mt-2 text-sm leading-6 ${screen === tab.value ? "text-slate-200" : "text-slate-600"}`}>
                {tab.note}
              </p>
            </AppLink>
          ))}
        </section>

        {screen === "dashboard" ? (
          <DashboardOverviewPanel
            overview={previewDashboardOverview}
            reminderFeed={previewReminderFeed}
          />
        ) : null}

        {screen === "today" ? (
          <TodayRecordForm
            initialValues={previewTodayValues}
            reminderFeed={previewReminderFeed}
            previewMode
          />
        ) : null}

        {screen === "trends" ? <PreviewTrendsPanel metric={metric} days={days} /> : null}

        {screen === "settings" ? (
          <div className="space-y-6">
            <ProfileForm initialValues={previewProfileValues} previewMode />
            <GoalsForm initialValues={previewGoalsValues} previewMode />
          </div>
        ) : null}

      </div>
    </main>
  );
}
