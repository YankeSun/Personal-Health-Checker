import { z } from "zod";

export const trendMetricSchema = z.enum(["sleep", "weight", "water"]);
export const trendDaysSchema = z.enum(["7", "30"]);

export type TrendMetricParam = z.infer<typeof trendMetricSchema>;
export type TrendDaysParam = z.infer<typeof trendDaysSchema>;
