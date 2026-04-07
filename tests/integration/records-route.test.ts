import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getDailyRecordsByUserAndDateRange = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/daily-record-service", () => ({
  getDailyRecordsByUserAndDateRange,
}));

describe("records route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not logged in", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/records/route");
    const response = await GET(
      new Request("http://localhost:3000/api/records?from=2026-04-01&to=2026-04-03"),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("validates query ranges", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });

    const { GET } = await import("@/app/api/records/route");
    const response = await GET(
      new Request("http://localhost:3000/api/records?from=2026-04-04&to=2026-04-03"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("起始日期不能晚于结束日期");
  });

  it("returns records in the requested range", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
    });
    getDailyRecordsByUserAndDateRange.mockResolvedValue([
      {
        id: "record_1",
        date: "2026-04-01",
        sleepHours: 7.2,
        weightKg: 62.3,
        waterMl: 1800,
      },
    ]);

    const { GET } = await import("@/app/api/records/route");
    const response = await GET(
      new Request("http://localhost:3000/api/records?from=2026-04-01&to=2026-04-03"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getDailyRecordsByUserAndDateRange).toHaveBeenCalledWith(
      "user_1",
      "2026-04-01",
      "2026-04-03",
    );
    expect(data.records[0].id).toBe("record_1");
  });
});
