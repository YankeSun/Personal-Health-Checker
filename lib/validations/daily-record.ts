import { z } from "zod";

export const dailyRecordDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不正确");

const dailyRecordFieldsObjectSchema = z.object({
  sleepHours: z
    .number()
    .min(0, "睡眠时长不能小于 0")
    .max(24, "睡眠时长不能超过 24 小时")
    .nullable(),
  weightKg: z
    .number()
    .min(1, "体重不能小于 1 kg")
    .max(500, "体重不能超过 500 kg")
    .nullable(),
  waterMl: z
    .number()
    .int("饮水量必须是整数")
    .min(0, "饮水量不能小于 0 ml")
    .max(20000, "饮水量不能超过 20000 ml")
    .nullable(),
});

function withAtLeastOneMetric<
  T extends {
    sleepHours: number | null;
    weightKg: number | null;
    waterMl: number | null;
  },
>(schema: z.ZodType<T>) {
  return schema
  .superRefine((value, context) => {
    if (
      value.sleepHours === null &&
      value.weightKg === null &&
      value.waterMl === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "至少填写一项记录",
        path: ["sleepHours"],
      });
    }
  });
}

export const dailyRecordFieldsSchema = withAtLeastOneMetric(
  dailyRecordFieldsObjectSchema,
);

export const dailyRecordInputSchema = withAtLeastOneMetric(
  dailyRecordFieldsObjectSchema.extend({
  date: dailyRecordDateSchema,
  }),
);

export type DailyRecordInput = z.infer<typeof dailyRecordInputSchema>;
export type DailyRecordFieldsInput = z.infer<typeof dailyRecordFieldsSchema>;
