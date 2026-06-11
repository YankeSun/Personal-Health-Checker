import { z } from "zod";

export const alphaFeedbackSchema = z.object({
  source: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1).max(5),
  valueCue: z.enum([
    "KEEP_RECORDING",
    "UNDERSTAND_WEIGHT",
    "SEE_PROGRESS",
    "NOT_SURE",
  ]),
  friction: z.enum([
    "TOO_MUCH_INPUT",
    "UNCLEAR_VALUE",
    "FORGET_TO_RECORD",
    "NO_FRICTION",
  ]),
  comment: z.string().trim().max(160).optional().default(""),
});

export type AlphaFeedbackInput = z.infer<typeof alphaFeedbackSchema>;
