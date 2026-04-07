import { DashboardOverviewPanel } from "@/components/dashboard/dashboard-overview";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardOverviewByUserId } from "@/lib/services/dashboard-service";
import { getReminderFeedByUserId } from "@/lib/services/reminder-service";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = user.profile;

  if (!profile) {
    return null;
  }

  const [overview, reminderFeed] = await Promise.all([
    getDashboardOverviewByUserId(user.id, profile, [7, 30]),
    getReminderFeedByUserId(user.id, profile),
  ]);

  return <DashboardOverviewPanel overview={overview} reminderFeed={reminderFeed} />;
}
