import { z } from "zod";

export const payIntentSchema = z.object({
  offer: z.enum([
    "WEIGHT_REPORT_30D",
    "WEIGHT_CHALLENGE_7D",
    "GOAL_PROGRESS_SUMMARY",
  ]),
  source: z.string().trim().min(1).max(80),
});

export type PayIntentInput = z.infer<typeof payIntentSchema>;
