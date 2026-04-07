import { Metric } from "@prisma/client";

import { GoalsForm } from "@/components/forms/goals-form";
import { ProfileForm } from "@/components/forms/profile-form";
import { requireUser } from "@/lib/auth/guards";
import { getGoalsByUserId } from "@/lib/services/goals-service";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = user.profile;

  if (!profile) {
    return null;
  }

  const goals = await getGoalsByUserId(user.id);

  return (
    <div className="space-y-6">
      <ProfileForm
        initialValues={{
          email: user.email,
          displayName: profile.displayName,
          timezone: profile.timezone,
          weightUnit: profile.weightUnit,
          waterUnit: profile.waterUnit,
          reminderEnabled: profile.reminderEnabled,
        }}
      />
      <GoalsForm
        initialValues={{
          weightUnit: profile.weightUnit,
          waterUnit: profile.waterUnit,
          goals: [
            goals.find((goal) => goal.metric === Metric.SLEEP)!,
            goals.find((goal) => goal.metric === Metric.WEIGHT)!,
            goals.find((goal) => goal.metric === Metric.WATER)!,
          ],
        }}
      />
    </div>
  );
}
