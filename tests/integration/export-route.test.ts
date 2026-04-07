import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getDailyRecordsByUserAndDateRange = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/services/daily-record-service", () => ({
  getDailyRecordsByUserAndDateRange,
}));

describe("export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not logged in", async () => {
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/export/route");
    const response = await GET(
      new Request("http://localhost:3000/api/export?from=2026-04-01&to=2026-04-03"),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("exports records as csv by default", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
    });
    getDailyRecordsByUserAndDateRange.mockResolvedValue([
      {
        id: "record_1",
        date: "2026-04-01",
        sleepHours: 7.5,
        weightKg: 63.2,
        waterMl: 1800,
      },
    ]);

    const { GET } = await import("@/app/api/export/route");
    const response = await GET(
      new Request("http://localhost:3000/api/export?from=2026-04-01&to=2026-04-03"),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain(".csv");
    expect(text).toContain("date,sleepHours,weight,weightUnit,water,waterUnit");
    expect(text).toContain("2026-04-01,7.5,63.2,KG,1800,ML");
  });

  it("exports records as json when requested", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
        weightUnit: "LB",
        waterUnit: "OZ",
      },
    });
    getDailyRecordsByUserAndDateRange.mockResolvedValue([
      {
        id: "record_1",
        date: "2026-04-01",
        sleepHours: 7.5,
        weightKg: 63.5,
        waterMl: 1800,
      },
    ]);

    const { GET } = await import("@/app/api/export/route");
    const response = await GET(
      new Request("http://localhost:3000/api/export?format=json&from=2026-04-01&to=2026-04-03"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(".json");
    expect(data.profile.weightUnit).toBe("LB");
    expect(data.records[0]).toMatchObject({
      date: "2026-04-01",
      sleepHours: 7.5,
      weightUnit: "LB",
      waterUnit: "OZ",
    });
  });

  it("validates export query parameters", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user_1",
      profile: {
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
      },
    });

    const { GET } = await import("@/app/api/export/route");
    const response = await GET(
      new Request("http://localhost:3000/api/export?format=xml&from=2026-04-03&to=2026-04-01"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });
});
