"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendOverview } from "@/lib/services/trends-service";

type TrendChartProps = {
  trend: TrendOverview;
};

export function TrendChart({ trend }: TrendChartProps) {
  const hasData = trend.points.some((point) => point.value !== null);

  if (!hasData) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        这一时间范围内还没有可用于绘制图表的记录。
      </div>
    );
  }

  const firstPoint = trend.points[0];

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={trend.points}
          margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            stroke="#64748b"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={48}
          />
          <Tooltip
            formatter={(value) => [
              `${value ?? "--"} ${trend.unitLabel}`,
              trend.metricLabel,
            ]}
            labelFormatter={(label) => `日期 ${label}`}
            contentStyle={{
              borderRadius: 18,
              borderColor: "#cbd5e1",
              boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
            }}
          />
          {firstPoint?.goalTarget !== null ? (
            <ReferenceLine
              y={firstPoint.goalTarget}
              stroke="#10b981"
              strokeDasharray="6 6"
            />
          ) : null}
          {firstPoint?.goalMin !== null ? (
            <ReferenceLine
              y={firstPoint.goalMin}
              stroke="#14b8a6"
              strokeDasharray="4 4"
            />
          ) : null}
          {firstPoint?.goalMax !== null ? (
            <ReferenceLine
              y={firstPoint.goalMax}
              stroke="#14b8a6"
              strokeDasharray="4 4"
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0f172a"
            strokeWidth={3}
            dot={{ r: 4, fill: "#0f172a" }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
