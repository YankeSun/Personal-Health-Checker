import { z } from "zod";

export const wechatLoginSchema = z.object({
  code: z.string().trim().min(1, "缺少微信登录 code"),
  displayName: z.string().trim().min(1).max(40).optional(),
  legalConsentAccepted: z.boolean().optional(),
  legalConsentVersion: z.string().trim().min(1).max(40).optional(),
  legalConsentAt: z.string().datetime().optional(),
});

export type WechatLoginInput = z.infer<typeof wechatLoginSchema>;
