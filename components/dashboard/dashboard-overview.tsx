import { ReminderPanel } from "@/components/shared/reminder-panel";
import { AppLink } from "@/components/shared/app-link";
import { PayIntentButton } from "@/components/shared/pay-intent-button";
import type { DashboardOverview } from "@/lib/services/dashboard-service";
import type { ReminderFeed } from "@/lib/services/reminder-service";

type DashboardOverviewProps = {
  overview: DashboardOverview;
  reminderFeed: ReminderFeed;
};

function getGoalStatusLabel(goalMet: boolean | null, recorded: boolean) {
  if (!recorded) {
    return "今天未记";
  }

  if (goalMet === null) {
    return "目标未设";
  }

  return goalMet ? "已对齐" : "待观察";
}

function getComparisonToneClass(direction: "up" | "down" | "flat" | "none") {
  if (direction === "up") {
    return "bg-sky-100 text-sky-800";
  }

  if (direction === "down") {
    return "bg-amber-100 text-amber-800";
  }

  if (direction === "flat") {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-slate-200 text-slate-700";
}

function getComparisonLabel(direction: "up" | "down" | "flat" | "none") {
  if (direction === "up") {
    return "比上一段更高";
  }

  if (direction === "down") {
    return "比上一段更低";
  }

  if (direction === "flat") {
    return "和上一段接近";
  }

  return "上一段数据不足";
}

function getWeightContextToneClass(trend: DashboardOverview["weightContext"]["trend"]) {
  if (trend === "down") {
    return "border-emerald-200 bg-emerald-50";
  }

  if (trend === "up") {
    return "border-amber-200 bg-amber-50";
  }

  if (trend === "stable") {
    return "border-sky-200 bg-sky-50";
  }

  return "border-slate-200 bg-white";
}

export function DashboardOverviewPanel({ overview, reminderFeed }: DashboardOverviewProps) {
  const summary30 = overview.windows.find((window) => window.days === 30) ?? overview.windows[0];
  const weightContext = overview.weightContext;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">连续天数</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {overview.streakDays}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            三项齐了，才算一次完整连续。
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">今日进度</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {overview.todayCompletedMetrics}/{overview.totalTrackedMetrics}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            今天越完整，后面的线越清楚。
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">30 天完整率</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {summary30.completionRate}%
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {summary30.completeRecordDays} / 30 天完成了三项记录。
          </p>
        </article>
      </section>

      <section
        className={`rounded-3xl border p-6 shadow-sm ${getWeightContextToneClass(
          weightContext.trend,
        )}`}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-[0.18em] text-slate-500">
            体重线索
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {weightContext.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {weightContext.description}
            </p>
          </div>
          <dl className="grid min-w-52 grid-cols-2 gap-3 text-sm lg:text-right">
            <div className="rounded-2xl bg-white/70 px-4 py-3">
              <dt className="text-slate-500">记录</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {weightContext.recordedDays}/{weightContext.days} 天
              </dd>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3">
              <dt className="text-slate-500">最近</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {weightContext.latestDisplay ?? "暂无"}
              </dd>
            </div>
          </dl>
        </div>
        {weightContext.topContextLabels.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {weightContext.topContextLabels.map((item) => (
              <span
                className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                key={item.label}
              >
                {item.label} {item.count} 次
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-900 bg-[#172033] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.18em] text-amber-200">
              REPORT BETA
            </p>
            <h2 className="mt-2 text-2xl font-semibold">30 天体重回看</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              体重变化、记录密度、目标进度和日常线索，整理成一份清晰月报。当前可加入等待名单。
            </p>
          </div>
          <div className="rounded-3xl bg-white p-4 text-slate-900">
            <PayIntentButton offer="WEIGHT_REPORT_30D" source="/dashboard" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {overview.insights.map((insight) => (
          <article
            className={`rounded-3xl border p-6 shadow-sm ${
              insight.tone === "warning"
                ? "border-amber-200 bg-amber-50"
                : insight.tone === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-sky-200 bg-sky-50"
            }`}
            key={insight.id}
          >
            <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{insight.description}</p>
            <AppLink
              className="mt-4 inline-flex rounded-full border border-current/15 bg-white/70 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white"
              href={insight.actionHref}
            >
              {insight.actionLabel}
            </AppLink>
          </article>
        ))}
      </section>

      <ReminderPanel
        feed={reminderFeed}
        title="本周留心"
        description="只保留最值得先看的两条。"
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">状态概览</h1>
          <p className="text-sm leading-6 text-slate-600">
            今天、7 天、30 天，放到一张图景里。
          </p>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">今天</h2>
            <p className="text-sm text-slate-500">{overview.todayDate}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {overview.todayMetrics.map((metric) => (
              <article
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                key={metric.metric}
              >
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {metric.displayValue ? `${metric.displayValue} ${metric.unitLabel}` : "未记录"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {metric.goalDescription ?? "目标还未设"}
                </p>
                <p
                  className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    metric.goalMet === true
                      ? "bg-emerald-100 text-emerald-800"
                      : metric.goalMet === false
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {getGoalStatusLabel(metric.goalMet, metric.recorded)}
                </p>
                {metric.goalDeviationDescription ? (
                  <p className="mt-3 text-sm text-slate-600">
                    {metric.goalDeviationDescription}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {overview.windows.map((window) => (
        <section
          className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          key={window.days}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                最近 {window.days} 天
              </h2>
              <p className="text-sm text-slate-600">
                {window.startDate} 至 {window.endDate}
              </p>
            </div>
            <p className="text-sm text-slate-500">
              完整 {window.completeRecordDays} 天，记录率 {window.completionRate}%
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {window.metrics.map((metric) => (
              <article
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                key={`${window.days}-${metric.metric}`}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <p className="text-sm text-slate-600">
                    {metric.goalDescription ?? "未设置目标"}
                  </p>
                </div>

                <dl className="mt-5 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-4">
                    <dt>记录</dt>
                    <dd className="font-medium text-slate-900">
                      {metric.recordedDays} / {window.days}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>达标率</dt>
                    <dd className="font-medium text-slate-900">
                      {metric.attainmentRate === null ? "未设置" : `${metric.attainmentRate}%`}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>最近</dt>
                    <dd className="font-medium text-slate-900">
                      {metric.latestDisplay
                        ? `${metric.latestDisplay} ${metric.unitLabel}`
                        : "暂无"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>平均</dt>
                    <dd className="font-medium text-slate-900">
                      {metric.averageDisplay
                        ? `${metric.averageDisplay} ${metric.unitLabel}`
                        : "暂无"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">和上一段比</h3>
                <p className="text-sm text-slate-600">
                  {window.comparison.previousStartDate} 至 {window.comparison.previousEndDate}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                完整率变化 {window.comparison.completionRateChange > 0 ? "+" : ""}
                {window.comparison.completionRateChange}% ，上一段为 {window.comparison.previousCompletionRate}%
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {window.comparison.metrics.map((metric) => (
                <article
                  className="rounded-3xl border border-slate-200 bg-white p-5"
                  key={`${window.days}-${metric.metric}-comparison`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getComparisonToneClass(
                        metric.averageDeltaDirection,
                      )}`}
                    >
                      {getComparisonLabel(metric.averageDeltaDirection)}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-4">
                      <dt>当前平均</dt>
                      <dd className="font-medium text-slate-900">
                        {metric.currentAverageDisplay
                          ? `${metric.currentAverageDisplay} ${metric.unitLabel}`
                          : "暂无"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>上一段平均</dt>
                      <dd className="font-medium text-slate-900">
                        {metric.previousAverageDisplay
                          ? `${metric.previousAverageDisplay} ${metric.unitLabel}`
                          : "暂无"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>平均变化</dt>
                      <dd className="font-medium text-slate-900">
                        {metric.averageDeltaDisplay
                          ? `${metric.averageDeltaDisplay} ${metric.unitLabel}`
                          : "暂无"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>达标率变化</dt>
                      <dd className="font-medium text-slate-900">
                        {metric.attainmentRateChange === null
                          ? "未设置"
                          : `${metric.attainmentRateChange > 0 ? "+" : ""}${metric.attainmentRateChange}%`}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
