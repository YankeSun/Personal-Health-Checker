import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须是 YYYY-MM-DD");

const recordsQueryObjectSchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
});

function withDateRangeValidation<T extends { from: string; to: string }>(
  schema: z.ZodType<T>,
) {
  return schema
  .superRefine((value, context) => {
    if (value.from > value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "起始日期不能晚于结束日期",
        path: ["from"],
      });
    }
  });
}

export const recordsQuerySchema = withDateRangeValidation(
  recordsQueryObjectSchema,
);

export const exportRecordsQuerySchema = withDateRangeValidation(
  recordsQueryObjectSchema.extend({
    format: z.enum(["csv", "json"]).default("csv"),
  }),
);

export type RecordsQueryInput = z.infer<typeof recordsQuerySchema>;
export type ExportRecordsQueryInput = z.infer<typeof exportRecordsQuerySchema>;
