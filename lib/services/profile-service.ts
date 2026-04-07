import { prisma } from "@/lib/db";
import { ProfileInput } from "@/lib/validations/profile";

export async function getProfileByUserId(userId: string) {
  return prisma.userProfile.findUnique({
    where: {
      userId,
    },
  });
}

export async function updateProfileByUserId(userId: string, input: ProfileInput) {
  return prisma.userProfile.update({
    where: {
      userId,
    },
    data: {
      displayName: input.displayName,
      timezone: input.timezone,
      weightUnit: input.weightUnit,
      waterUnit: input.waterUnit,
      reminderEnabled: input.reminderEnabled,
    },
  });
}
