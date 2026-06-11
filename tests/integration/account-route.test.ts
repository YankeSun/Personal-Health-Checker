import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const clearSession = vi.fn();
const deleteUserAccountByUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  clearSession,
  getCurrentUser,
}));

vi.mock("@/lib/services/account-service", () => ({
  deleteUserAccountByUserId,
}));

describe("account route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when deleting without a session", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/account/route");
    const response = await DELETE(
      new Request("http://localhost:3000/api/account", {
        method: "DELETE",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
    expect(deleteUserAccountByUserId).not.toHaveBeenCalled();
  });

  it("deletes the current account and clears the request session", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });

    const { DELETE } = await import("@/app/api/account/route");
    const request = new Request("http://localhost:3000/api/account", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer token",
      },
    });
    const response = await DELETE(
      request,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(getCurrentUser).toHaveBeenCalledWith(expect.any(Request));
    expect(deleteUserAccountByUserId).toHaveBeenCalledWith("user_1");
    expect(clearSession).toHaveBeenCalledWith(request);
  });
});
