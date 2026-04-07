import { requireUser } from "@/lib/auth/guards";
import { HistoryMonthView } from "@/components/history/history-month-view";
import { getHistoryMonthOverviewByUserId } from "@/lib/services/history-service";
import { normalizeHistoryMonthForTimezone } from "@/lib/validations/history";

type HistoryPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireUser();
  const profile = user.profile;

  if (!profile) {
    return null;
  }

  const resolvedSearchParams = await searchParams;
  const month = normalizeHistoryMonthForTimezone(
    resolvedSearchParams.month,
    profile.timezone,
  );
  const overview = await getHistoryMonthOverviewByUserId(
    user.id,
    profile,
    month,
  );

  return <HistoryMonthView overview={overview} />;
}
