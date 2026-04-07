import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { getProfileByUserId, updateProfileByUserId } from "@/lib/services/profile-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("profile-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the current user profile", async () => {
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({
      id: "profile_1",
      userId: "user_1",
      displayName: "Demo",
      timezone: "Asia/Shanghai",
      weightUnit: "KG",
      waterUnit: "ML",
      reminderEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profile = await getProfileByUserId("user_1");

    expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
      },
    });
    expect(profile?.displayName).toBe("Demo");
  });

  it("updates the current user profile", async () => {
    vi.mocked(prisma.userProfile.update).mockResolvedValue({
      id: "profile_1",
      userId: "user_1",
      displayName: "Updated Demo",
      timezone: "UTC",
      weightUnit: "LB",
      waterUnit: "OZ",
      reminderEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profile = await updateProfileByUserId("user_1", {
      displayName: "Updated Demo",
      timezone: "UTC",
      weightUnit: "LB",
      waterUnit: "OZ",
      reminderEnabled: false,
    });

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
      },
      data: {
        displayName: "Updated Demo",
        timezone: "UTC",
        weightUnit: "LB",
        waterUnit: "OZ",
        reminderEnabled: false,
      },
    });
    expect(profile.reminderEnabled).toBe(false);
  });
});
