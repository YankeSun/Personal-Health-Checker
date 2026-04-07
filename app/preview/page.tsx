import { redirect } from "next/navigation";

type PreviewRedirectPageProps = {
  searchParams: Promise<{
    screen?: string;
    metric?: string;
    days?: string;
  }>;
};

export default async function PreviewPage({ searchParams }: PreviewRedirectPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextSearchParams = new URLSearchParams();

  if (resolvedSearchParams.screen) {
    nextSearchParams.set("screen", resolvedSearchParams.screen);
  }

  if (resolvedSearchParams.metric) {
    nextSearchParams.set("metric", resolvedSearchParams.metric);
  }

  if (resolvedSearchParams.days) {
    nextSearchParams.set("days", resolvedSearchParams.days);
  }

  redirect(
    nextSearchParams.size > 0
      ? `/experience?${nextSearchParams.toString()}`
      : "/experience",
  );
}
