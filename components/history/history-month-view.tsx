import { AppLink } from "@/components/shared/app-link";
import type { HistoryMonthOverview } from "@/lib/services/history-service";

type HistoryMonthViewProps = {
  overview: HistoryMonthOverview;
};

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

function getCellStyles(
  cell: HistoryMonthOverview["calendar"][number],
) {
  if (!cell.inCurrentMonth) {
    return "border-slate-100 bg-slate-50 text-slate-300";
  }

  if (cell.isComplete) {
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }

  if (cell.hasAnyRecord) {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }

  return "border-slate-200 bg-white text-slate-700";
}

export function HistoryMonthView({ overview }: HistoryMonthViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">历史记录中心</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              以月份为单位查看记录完整度，快速回到某一天补录、修正，并导出整月数据。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400"
              href={`/api/export?format=csv&from=${overview.startDate}&to=${overview.endDate}`}
            >
              导出本月 CSV
            </a>
            <a
              className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
              href={`/api/export?format=json&from=${overview.startDate}&to=${overview.endDate}`}
            >
              导出本月 JSON
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {overview.previousMonth ? (
              <AppLink
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                href={`/history?month=${overview.previousMonth}`}
              >
                上个月
              </AppLink>
            ) : null}
            {overview.nextMonth ? (
              <AppLink
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                href={`/history?month=${overview.nextMonth}`}
              >
                下个月
              </AppLink>
            ) : null}
          </div>

          <div className="text-right">
            <p className="text-2xl font-semibold text-slate-900">{overview.monthLabel}</p>
            <p className="mt-1 text-sm text-slate-500">
              {overview.startDate} 至 {overview.endDate}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">完整记录天数</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{overview.completeDays}</p>
          <p className="mt-2 text-sm text-slate-600">三项数据都已记录</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">部分记录天数</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{overview.partialDays}</p>
          <p className="mt-2 text-sm text-slate-600">还有部分指标待补录</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">空白天数</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{overview.emptyDays}</p>
          <p className="mt-2 text-sm text-slate-600">尚未留下任何记录</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">记录密度</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {overview.recordDensity}%
          </p>
          <p className="mt-2 text-sm text-slate-600">本月有记录的自然日占比</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {overview.insights.map((insight) => {
          const toneClass =
            insight.tone === "success"
              ? "border-emerald-200 bg-emerald-50"
              : insight.tone === "warning"
                ? "border-amber-200 bg-amber-50"
                : "border-sky-200 bg-sky-50";
          const badgeClass =
            insight.tone === "success"
              ? "bg-emerald-100 text-emerald-800"
              : insight.tone === "warning"
                ? "bg-amber-100 text-amber-800"
                : "bg-sky-100 text-sky-800";

          return (
            <article
              className={`rounded-3xl border p-6 shadow-sm ${toneClass}`}
              key={insight.title}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{insight.title}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeClass}`}
                >
                  月度小结
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{insight.description}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">月视图</h2>
          <p className="text-sm leading-6 text-slate-600">
            绿色表示完整记录，黄色表示部分记录，白色表示尚未开始。点击任意日期都可以直接进入编辑。
          </p>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-3">
          {weekdayLabels.map((label) => (
            <div
              className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
              key={label}
            >
              {label}
            </div>
          ))}

          {overview.calendar.map((cell) => (
            <AppLink
              className={`min-h-[96px] rounded-2xl border p-3 transition hover:border-slate-400 hover:bg-white ${getCellStyles(
                cell,
              )} ${cell.isToday ? "ring-2 ring-slate-900/10" : ""}`}
              href={`/today?date=${cell.date}`}
              key={cell.date}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{cell.dayNumber}</span>
                {cell.isToday ? (
                  <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white">
                    今日
                  </span>
                ) : null}
              </div>
              <p className="mt-6 text-xs opacity-80">
                {cell.isComplete
                  ? "完整记录"
                  : cell.hasAnyRecord
                    ? `已记录 ${cell.completedMetrics}/3`
                    : "尚未记录"}
              </p>
            </AppLink>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">每日明细</h2>
          <p className="text-sm leading-6 text-slate-600">
            按日期倒序查看这个月的每一天，适合快速定位需要补录或修正的记录。
          </p>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="pb-4 pr-4 font-medium">日期</th>
                <th className="pb-4 pr-4 font-medium">睡眠</th>
                <th className="pb-4 pr-4 font-medium">体重</th>
                <th className="pb-4 pr-4 font-medium">饮水</th>
                <th className="pb-4 pr-4 font-medium">状态</th>
                <th className="pb-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.rows.map((row) => {
                const statusClass = row.isComplete
                  ? "bg-emerald-50 text-emerald-900"
                  : row.hasAnyRecord
                    ? "bg-amber-50 text-amber-900"
                    : "bg-slate-100 text-slate-600";

                return (
                  <tr className="align-top" key={row.date}>
                    <td className="py-4 pr-4">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.date}</p>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-700">
                      {row.sleepDisplay ? `${row.sleepDisplay} 小时` : "—"}
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-700">
                      {row.weightDisplay ? `${row.weightDisplay} ${row.weightUnitLabel}` : "—"}
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-700">
                      {row.waterDisplay ? `${row.waterDisplay} ${row.waterUnitLabel}` : "—"}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
                        {row.isComplete
                          ? "完整记录"
                          : row.hasAnyRecord
                            ? `已记录 ${row.completedMetrics}/3`
                            : "尚未记录"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <AppLink
                        className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                        href={`/today?date=${row.date}`}
                      >
                        查看并编辑
                      </AppLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
