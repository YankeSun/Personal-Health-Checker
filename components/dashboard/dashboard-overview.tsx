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
    return "今日未记录";
  }

  if (goalMet === null) {
    return "尚未设置目标";
  }

  return goalMet ? "今日已达标" : "今日未达标";
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
    return "较上一周期升高";
  }

  if (direction === "down") {
    return "较上一周期下降";
  }

  if (direction === "flat") {
    return "较上一周期持平";
  }

  return "上一周期数据不足";
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
          <p className="text-sm font-medium text-slate-500">连续记录天数</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {overview.streakDays}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            只有睡眠、体重、饮水三项都填写，才会计入连续记录。
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">今日完成度</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {overview.todayCompletedMetrics}/{overview.totalTrackedMetrics}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            先把今天的数据补齐，后面的趋势和达标率会更有参考意义。
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">最近 30 天完整记录率</p>
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
              体重变化线索
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
              <dt className="text-slate-500">体重记录</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {weightContext.recordedDays}/{weightContext.days} 天
              </dd>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3">
              <dt className="text-slate-500">最近值</dt>
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
            <h2 className="mt-2 text-2xl font-semibold">30 天体重观察报告</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              把体重变化、记录密度、目标进度和日常背景整理成一份月度回看。当前开放内测意向，不收取费用。
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
        title="本周关注点"
        description="这里会优先提示今天缺失的记录、最近 7 天的达标压力，以及你的连续记录状态。"
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">仪表盘</h1>
          <p className="text-sm leading-6 text-slate-600">
            这里汇总最近 7 天和 30 天的记录情况、达标率和今天的即时状态。
          </p>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">今天的状态</h2>
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
                  {metric.goalDescription ?? "还没有为这项配置目标"}
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
                最近 {window.days} 天概览
              </h2>
              <p className="text-sm text-slate-600">
                时间范围：{window.startDate} 至 {window.endDate}
              </p>
            </div>
            <p className="text-sm text-slate-500">
              完整记录 {window.completeRecordDays} 天，记录率 {window.completionRate}%
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
                    <dt>记录天数</dt>
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
                    <dt>最近值</dt>
                    <dd className="font-medium text-slate-900">
                      {metric.latestDisplay
                        ? `${metric.latestDisplay} ${metric.unitLabel}`
                        : "暂无"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>平均值</dt>
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
                <h3 className="text-lg font-semibold text-slate-900">与上一周期对比</h3>
                <p className="text-sm text-slate-600">
                  对比范围：{window.comparison.previousStartDate} 至 {window.comparison.previousEndDate}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                完整记录率变化 {window.comparison.completionRateChange > 0 ? "+" : ""}
                {window.comparison.completionRateChange}% ，上一周期为 {window.comparison.previousCompletionRate}%
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
                      <dt>当前平均值</dt>
                      <dd className="font-medium text-slate-900">
                        {metric.currentAverageDisplay
                          ? `${metric.currentAverageDisplay} ${metric.unitLabel}`
                          : "暂无"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>上一周期平均值</dt>
                      <dd className="font-medium text-slate-900">
                        {metric.previousAverageDisplay
                          ? `${metric.previousAverageDisplay} ${metric.unitLabel}`
                          : "暂无"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>平均值变化</dt>
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
