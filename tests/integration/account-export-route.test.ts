import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getAccountExportByUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/account-service", () => ({
  getAccountExportByUserId,
}));

describe("account export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when exporting without a session", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/account/export/route");
    const response = await GET(
      new Request("http://localhost:3000/api/account/export"),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("returns the current account export", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });
    getAccountExportByUserId.mockResolvedValue({
      exportedAt: "2026-04-02T00:00:00.000Z",
      user: {
        id: "user_1",
      },
      dailyRecords: [],
    });

    const { GET } = await import("@/app/api/account/export/route");
    const response = await GET(
      new Request("http://localhost:3000/api/account/export", {
        headers: {
          Authorization: "Bearer token",
        },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "personal-health-checker-account.json",
    );
    expect(getCurrentUser).toHaveBeenCalledWith(expect.any(Request));
    expect(getAccountExportByUserId).toHaveBeenCalledWith("user_1");
    expect(data.user.id).toBe("user_1");
  });
});
