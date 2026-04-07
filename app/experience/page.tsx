import { z } from "zod";

import { PreviewWorkbench } from "@/components/preview/preview-workbench";
import { trendDaysSchema, trendMetricSchema } from "@/lib/validations/trends";

const experienceSearchParamsSchema = z.object({
  screen: z.enum(["dashboard", "today", "trends", "settings"]).default("dashboard"),
  metric: trendMetricSchema.default("sleep"),
  days: trendDaysSchema.default("30"),
});

type ExperiencePageProps = {
  searchParams: Promise<{
    screen?: string;
    metric?: string;
    days?: string;
  }>;
};

export default async function ExperiencePage({ searchParams }: ExperiencePageProps) {
  const resolvedSearchParams = await searchParams;
  const parsed = experienceSearchParamsSchema.safeParse({
    screen: resolvedSearchParams.screen ?? "dashboard",
    metric: resolvedSearchParams.metric ?? "sleep",
    days: resolvedSearchParams.days ?? "30",
  });

  const screen = parsed.success ? parsed.data.screen : "dashboard";
  const metric = parsed.success ? parsed.data.metric : "sleep";
  const days = parsed.success ? parsed.data.days : "30";

  return <PreviewWorkbench screen={screen} metric={metric} days={days} />;
}
