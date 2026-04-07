import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getProfileByUserId = vi.fn();
const updateProfileByUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/profile-service", () => ({
  getProfileByUserId,
  updateProfileByUserId,
}));

describe("profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not logged in", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/profile/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("returns the active user profile", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
    });
    getProfileByUserId.mockResolvedValue({
      displayName: "Demo",
      timezone: "Asia/Shanghai",
      weightUnit: "KG",
      waterUnit: "ML",
      reminderEnabled: true,
    });

    const { GET } = await import("@/app/api/profile/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toEqual({
      email: "demo@example.com",
      displayName: "Demo",
      timezone: "Asia/Shanghai",
      weightUnit: "KG",
      waterUnit: "ML",
      reminderEnabled: true,
    });
  });

  it("updates the active user profile", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
    });
    updateProfileByUserId.mockResolvedValue({
      displayName: "Updated Demo",
      timezone: "UTC",
      weightUnit: "LB",
      waterUnit: "OZ",
      reminderEnabled: false,
    });

    const { PATCH } = await import("@/app/api/profile/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "Updated Demo",
          timezone: "UTC",
          weightUnit: "LB",
          waterUnit: "OZ",
          reminderEnabled: false,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(updateProfileByUserId).toHaveBeenCalledWith("user_1", {
      displayName: "Updated Demo",
      timezone: "UTC",
      weightUnit: "LB",
      waterUnit: "OZ",
      reminderEnabled: false,
    });
    expect(data.profile.displayName).toBe("Updated Demo");
  });

  it("validates the update payload", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
    });

    const { PATCH } = await import("@/app/api/profile/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "",
          timezone: "UTC",
          weightUnit: "KG",
          waterUnit: "ML",
          reminderEnabled: true,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("昵称至少需要 2 个字符");
  });
});
