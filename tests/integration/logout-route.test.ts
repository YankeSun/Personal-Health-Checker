import { beforeEach, describe, expect, it, vi } from "vitest";

const clearSession = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  clearSession,
}));

describe("logout route", () => {
  beforeEach(() => {
    clearSession.mockReset();
  });

  it("clears the active session and redirects to login", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
