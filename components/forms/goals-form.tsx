"use client";

import { GoalMode, Metric } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { getApiErrorMessage } from "@/lib/utils/client-api";
import {
  formatGoalRuleDescription,
  getGoalMeta,
  getGoalUnitLabel,
} from "@/lib/utils/goal-copy";
import {
  fromDisplaySleep,
  fromDisplayWater,
  fromDisplayWeight,
  toDisplaySleep,
  toDisplayWater,
  toDisplayWeight,
} from "@/lib/utils/units";
import { GoalView, METRIC_ORDER } from "@/lib/utils/goals";

type GoalsFormProps = {
  initialValues: {
    weightUnit: "KG" | "LB";
    waterUnit: "ML" | "OZ";
    goals: GoalView[];
  };
  previewMode?: boolean;
};

type GoalFormState = {
  metric: Metric;
  mode: GoalMode;
  isActive: boolean;
  targetValue: string;
  minValue: string;
  maxValue: string;
};

function toGoalFormState(
  goal: GoalView,
  weightUnit: "KG" | "LB",
  waterUnit: "ML" | "OZ",
): GoalFormState {
  const targetValue =
    goal.metric === Metric.SLEEP
      ? toDisplaySleep(goal.targetValue)
      : goal.metric === Metric.WEIGHT
        ? toDisplayWeight(goal.targetValue, weightUnit)
        : toDisplayWater(goal.targetValue, waterUnit);
  const minValue =
    goal.metric === Metric.SLEEP
      ? toDisplaySleep(goal.minValue)
      : goal.metric === Metric.WEIGHT
        ? toDisplayWeight(goal.minValue, weightUnit)
        : toDisplayWater(goal.minValue, waterUnit);
  const maxValue =
    goal.metric === Metric.SLEEP
      ? toDisplaySleep(goal.maxValue)
      : goal.metric === Metric.WEIGHT
        ? toDisplayWeight(goal.maxValue, weightUnit)
        : toDisplayWater(goal.maxValue, waterUnit);

  return {
    metric: goal.metric,
    mode: goal.mode,
    isActive: goal.isActive,
    targetValue,
    minValue,
    maxValue,
  };
}

function convertGoalValue(
  metric: Metric,
  value: string,
  weightUnit: "KG" | "LB",
  waterUnit: "ML" | "OZ",
) {
  if (metric === Metric.SLEEP) {
    return fromDisplaySleep(value);
  }

  if (metric === Metric.WEIGHT) {
    return fromDisplayWeight(value, weightUnit);
  }

  return fromDisplayWater(value, waterUnit);
}

function getUnitLabel(
  metric: Metric,
  weightUnit: "KG" | "LB",
  waterUnit: "ML" | "OZ",
) {
  return getGoalUnitLabel(metric, {
    weightUnit,
    waterUnit,
  });
}

export function GoalsForm({ initialValues, previewMode = false }: GoalsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<Record<Metric, GoalFormState>>(() =>
    Object.fromEntries(
      initialValues.goals.map((goal) => [
        goal.metric,
        toGoalFormState(goal, initialValues.weightUnit, initialValues.waterUnit),
      ]),
    ) as Record<Metric, GoalFormState>,
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsPending(true);

    const payload = METRIC_ORDER.map((metric) => {
      const goal = form[metric];

      return {
        metric,
        mode: goal.mode,
        isActive: goal.isActive,
        targetValue: convertGoalValue(
          metric,
          goal.targetValue,
          initialValues.weightUnit,
          initialValues.waterUnit,
        ),
        minValue: convertGoalValue(
          metric,
          goal.minValue,
          initialValues.weightUnit,
          initialValues.waterUnit,
        ),
        maxValue: convertGoalValue(
          metric,
          goal.maxValue,
          initialValues.weightUnit,
          initialValues.waterUnit,
        ),
      };
    });

    if (previewMode) {
      setSuccess("目标已更新。");
      setIsPending(false);
      return;
    }

    try {
      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "保存目标失败，请稍后再试"));
        return;
      }

      setSuccess("目标已保存");
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
          <h2 className="text-2xl font-semibold text-slate-900">健康目标</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            为睡眠、体重和饮水设定清晰目标，让仪表盘和趋势页面更准确地判断你每天的状态变化。
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {METRIC_ORDER.map((metric) => {
            const goal = form[metric];
            const meta = getGoalMeta(metric);
            const unitLabel = getUnitLabel(
              metric,
              initialValues.weightUnit,
              initialValues.waterUnit,
            );
            const goalRuleDescription = formatGoalRuleDescription(metric, {
              metric,
              mode: goal.mode,
              isActive: goal.isActive,
              targetValue: convertGoalValue(
                metric,
                goal.targetValue,
                initialValues.weightUnit,
                initialValues.waterUnit,
              ),
              minValue: convertGoalValue(
                metric,
                goal.minValue,
                initialValues.weightUnit,
                initialValues.waterUnit,
              ),
              maxValue: convertGoalValue(
                metric,
                goal.maxValue,
                initialValues.weightUnit,
                initialValues.waterUnit,
              ),
            }, {
              weightUnit: initialValues.weightUnit,
              waterUnit: initialValues.waterUnit,
            });

            return (
              <section
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                key={metric}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {meta.title}
                    </h3>
                    <p className="text-sm leading-6 text-slate-600">
                      {meta.description}
                    </p>
                  </div>

                  <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={goal.isActive}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [metric]: {
                            ...current[metric],
                            isActive: event.target.checked,
                          },
                        }))
                      }
                    />
                    启用目标
                  </label>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {([GoalMode.AT_LEAST, GoalMode.AT_MOST, GoalMode.IN_RANGE] as GoalMode[]).map(
                      (mode) => {
                        const isSelected = goal.mode === mode;
                        const isRecommended = mode === meta.recommendedMode;

                        return (
                          <button
                            key={mode}
                            type="button"
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              isSelected
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                            }`}
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                [metric]: {
                                  ...current[metric],
                                  mode,
                                },
                              }))
                            }
                          >
                            {meta.modeLabels[mode]}
                            {isRecommended && !isSelected && (
                              <span className="ml-1.5 text-[10px] uppercase tracking-wider opacity-70">
                                推荐
                              </span>
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>

                  {goal.mode === GoalMode.IN_RANGE ? (
                    <>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">
                          最小值（{unitLabel}）
                        </span>
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                          type="number"
                          step="0.1"
                          value={goal.minValue}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [metric]: {
                                ...current[metric],
                                minValue: event.target.value,
                              },
                            }))
                          }
                          placeholder="请输入最小值"
                        />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">
                          最大值（{unitLabel}）
                        </span>
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                          type="number"
                          step="0.1"
                          value={goal.maxValue}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [metric]: {
                                ...current[metric],
                                maxValue: event.target.value,
                              },
                            }))
                          }
                          placeholder="请输入最大值"
                        />
                      </label>
                    </>
                  ) : (
                    <label className="block space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        目标值（{unitLabel}）
                      </span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                        type="number"
                        step="0.1"
                        value={goal.targetValue}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [metric]: {
                              ...current[metric],
                              targetValue: event.target.value,
                            },
                          }))
                        }
                        placeholder="请输入目标值"
                      />
                    </label>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-sm font-medium text-slate-900">系统会这样判断</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {goal.isActive
                        ? (goalRuleDescription ?? "先把目标值填好，系统才会开始判断这项是否达标。")
                        : "关闭后，这项不会参与达标率、提醒和趋势线判断。"}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

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
            {previewMode ? "应用目标" : isPending ? "保存中..." : "保存目标"}
          </button>
        </div>
      </form>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">目标怎么选更自然</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>睡眠和饮水更适合用“至少”，因为日常更像是在追一个下限。</li>
            <li>体重更适合用“区间”，因为长期观察时通常看稳定范围，不看单点命中。</li>
            <li>只有你明确想控制上限时，才需要用“不超过”。</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
          <h3 className="text-base font-semibold text-emerald-950">目标会影响</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-emerald-900">
            <li>仪表盘会根据目标模式计算 7 天 / 30 天达标率。</li>
            <li>提醒模块会提示你哪些项目连续未达标。</li>
            <li>历史趋势页会对目标线做视觉标记。</li>
          </ul>
        </section>
      </aside>
    </section>
  );
}
