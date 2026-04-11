"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendOverview, TrendPoint } from "@/lib/services/trends-service";

type TrendChartProps = {
  trend: TrendOverview;
};

function CustomTooltip({
  active,
  payload,
  label,
  metricLabel,
  unitLabel,
}: {
  active?: boolean;
  payload?: Array<{
    payload: TrendPoint;
    value?: number;
    name?: string;
  }>;
  label?: string;
  metricLabel: string;
  unitLabel: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md">
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <p className="mt-1 text-sm text-slate-700">
        {metricLabel}：{point.value ?? "--"} {point.value !== null ? unitLabel : ""}
      </p>
      {point.isBackfilled && (
        <p className="mt-1 text-xs text-sky-600">此为补录记录</p>
      )}
    </div>
  );
}

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
  const hasBackfilled = trend.points.some((point) => point.isBackfilled);

  return (
    <div className="h-[360px] w-full">
      {hasBackfilled && (
        <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-900" />
            当日记录
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-sky-500 bg-white" />
            补录记录
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={trend.points}
          margin={{ top: hasBackfilled ? 8 : 16, right: 16, left: 0, bottom: 0 }}
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
            content={
              <CustomTooltip
                metricLabel={trend.metricLabel}
                unitLabel={trend.unitLabel}
              />
            }
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
            dot={(props) => {
              if (props.payload?.isBackfilled) {
                return null;
              }
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill="#0f172a"
                />
              );
            }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
          <Scatter
            dataKey="value"
            fill="#fff"
            stroke="#0ea5e9"
            strokeWidth={2}
            shape={(props) => {
              if (!props.payload?.isBackfilled || props.payload.value === null) {
                return null;
              }
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill="#fff"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
