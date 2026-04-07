import { GoalMode, Metric } from "@prisma/client";
import { z } from "zod";

const metricBoundaries = {
  [Metric.SLEEP]: { min: 0, max: 24, label: "睡眠目标" },
  [Metric.WEIGHT]: { min: 1, max: 500, label: "体重目标" },
  [Metric.WATER]: { min: 0, max: 20000, label: "饮水目标" },
} as const;

const goalItemSchema = z
  .object({
    metric: z.nativeEnum(Metric),
    mode: z.nativeEnum(GoalMode),
    isActive: z.boolean(),
    targetValue: z.number().nullable(),
    minValue: z.number().nullable(),
    maxValue: z.number().nullable(),
  })
  .superRefine((value, context) => {
    const boundary = metricBoundaries[value.metric];

    const validateValue = (
      fieldName: "targetValue" | "minValue" | "maxValue",
      fieldValue: number | null,
      missingMessage: string,
    ) => {
      if (fieldValue === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: missingMessage,
          path: [fieldName],
        });
        return;
      }

      if (fieldValue < boundary.min || fieldValue > boundary.max) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${boundary.label}超出可接受范围`,
          path: [fieldName],
        });
      }
    };

    if (!value.isActive) {
      return;
    }

    if (value.mode === GoalMode.IN_RANGE) {
      validateValue("minValue", value.minValue, "请填写最小目标值");
      validateValue("maxValue", value.maxValue, "请填写最大目标值");

      if (
        value.minValue !== null &&
        value.maxValue !== null &&
        value.minValue > value.maxValue
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "最小目标值不能大于最大目标值",
          path: ["minValue"],
        });
      }

      return;
    }

    validateValue("targetValue", value.targetValue, "请填写目标值");
  });

export const goalsSchema = z
  .array(goalItemSchema)
  .length(3, "必须同时提交睡眠、体重和饮水三项目标")
  .superRefine((goals, context) => {
    const metricSet = new Set(goals.map((goal) => goal.metric));

    if (metricSet.size !== 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "目标项目不能重复",
      });
    }
  });

export type GoalInput = z.infer<typeof goalItemSchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;
