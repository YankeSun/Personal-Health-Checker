import { AppLink } from "@/components/shared/app-link";
import type { RecordHistoryWindow } from "@/lib/services/record-history-service";
import { formatDateLabel } from "@/lib/utils/dates";

type RecordHistoryTableProps = {
  history: RecordHistoryWindow;
};

export function RecordHistoryTable({ history }: RecordHistoryTableProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">原始记录</h2>
          <p className="text-sm leading-6 text-slate-600">
            直接查看当前时间范围内每天的实际记录，快速发现缺失、补录和需要修正的日期。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400"
            href={`/api/export?format=csv&from=${history.startDate}&to=${history.endDate}`}
          >
            导出 CSV
          </a>
          <a
            className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
            href={`/api/export?format=json&from=${history.startDate}&to=${history.endDate}`}
          >
            导出 JSON
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-800">完整记录</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-950">{history.completeDays}</p>
          <p className="mt-2 text-sm text-emerald-900">三项数据都已补齐</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-800">部分记录</p>
          <p className="mt-3 text-3xl font-semibold text-amber-950">{history.partialDays}</p>
          <p className="mt-2 text-sm text-amber-900">还有部分指标需要补录</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-600">空白日期</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{history.emptyDays}</p>
          <p className="mt-2 text-sm text-slate-600">尚未留下任何记录</p>
        </article>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
              <th className="pb-4 pr-4 font-medium">日期</th>
              <th className="pb-4 pr-4 font-medium">睡眠</th>
              <th className="pb-4 pr-4 font-medium">体重</th>
              <th className="pb-4 pr-4 font-medium">饮水</th>
              <th className="pb-4 pr-4 font-medium">完成度</th>
              <th className="pb-4 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.rows.map((row) => {
              const statusClass = row.isComplete
                ? "bg-emerald-50 text-emerald-900"
                : row.hasAnyRecord
                  ? "bg-amber-50 text-amber-900"
                  : "bg-slate-100 text-slate-600";

              return (
                <tr className="align-top" key={row.date}>
                  <td className="py-4 pr-4">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{formatDateLabel(row.date)}</p>
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
  );
}
