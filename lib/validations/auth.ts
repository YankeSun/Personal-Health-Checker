import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱地址"),
  password: z
    .string()
    .min(8, "密码至少需要 8 位")
    .max(72, "密码长度不能超过 72 位"),
  displayName: z
    .string()
    .trim()
    .min(2, "昵称至少需要 2 个字符")
    .max(40, "昵称不能超过 40 个字符"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱地址"),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "缺少重置令牌"),
  password: z
    .string()
    .min(8, "密码至少需要 8 位")
    .max(72, "密码长度不能超过 72 位"),
});

export const tokenSchema = z.object({
  token: z.string().trim().min(1, "缺少令牌"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
