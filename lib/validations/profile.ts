import { z } from "zod";

export const weightUnitSchema = z.enum(["KG", "LB"]);
export const waterUnitSchema = z.enum(["ML", "OZ"]);

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "昵称至少需要 2 个字符")
    .max(40, "昵称不能超过 40 个字符"),
  timezone: z
    .string()
    .trim()
    .min(2, "请选择有效时区")
    .max(100, "时区格式不正确"),
  weightUnit: weightUnitSchema,
  waterUnit: waterUnitSchema,
  reminderEnabled: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
