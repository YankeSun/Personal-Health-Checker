"use client";

import { GoalMode, Metric } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { getApiErrorMessage } from "@/lib/utils/client-api";
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

const goalMeta = {
  [Metric.SLEEP]: {
    title: "睡眠目标",
    description: "每天睡够这个时长，身体的恢复效果会更好。",
    unitLabel: "小时",
    recommendedMode: GoalMode.AT_LEAST,
    modeLabels: {
      [GoalMode.AT_LEAST]: "每天至少睡够",
      [GoalMode.AT_MOST]: "每天不超过",
      [GoalMode.IN_RANGE]: "保持在这个区间",
    },
  },
  [Metric.WEIGHT]: {
    title: "体重目标",
    description: "用一个稳定的区间来观察体重变化，比单值更容易判断趋势。",
    unitLabel: "",
    recommendedMode: GoalMode.IN_RANGE,
    modeLabels: {
      [GoalMode.AT_LEAST]: "至少保持",
      [GoalMode.AT_MOST]: "每天不超过",
      [GoalMode.IN_RANGE]: "保持在这个区间",
    },
  },
  [Metric.WATER]: {
    title: "饮水目标",
    description: "每天累计喝够这个量，帮助身体保持水分平衡。",
    unitLabel: "",
    recommendedMode: GoalMode.AT_LEAST,
    modeLabels: {
      [GoalMode.AT_LEAST]: "每天至少喝够",
      [GoalMode.AT_MOST]: "每天不超过",
      [GoalMode.IN_RANGE]: "保持在这个区间",
    },
  },
} as const;

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
  if (metric === Metric.SLEEP) {
    return goalMeta[metric].unitLabel;
  }

  if (metric === Metric.WEIGHT) {
    return weightUnit === "KG" ? "kg" : "lb";
  }

  return waterUnit === "ML" ? "ml" : "oz";
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
            const unitLabel = getUnitLabel(
              metric,
              initialValues.weightUnit,
              initialValues.waterUnit,
            );

            return (
              <section
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                key={metric}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {goalMeta[metric].title}
                    </h3>
                    <p className="text-sm leading-6 text-slate-600">
                      {goalMeta[metric].description}
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
                        const isRecommended = mode === goalMeta[metric].recommendedMode;

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
                            {goalMeta[metric].modeLabels[mode]}
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
          <h3 className="text-base font-semibold text-slate-900">目标模式说明</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>至少达到：适合睡眠时长、饮水量这类越多越接近目标的指标。</li>
            <li>不超过：适合你想设上限控制的指标。</li>
            <li>保持区间：适合体重这类更常用区间判断的指标。</li>
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
