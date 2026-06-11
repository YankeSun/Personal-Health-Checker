import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureDatabaseSchema = vi.fn();
const queryRaw = vi.fn();

vi.mock("@/lib/db/ensure-schema", () => ({
  ensureDatabaseSchema,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: queryRaw,
  },
}));

describe("health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://health-check";
    delete process.env.WECHAT_MINI_PROGRAM_APP_ID;
    delete process.env.WECHAT_MINI_PROGRAM_APP_SECRET;
    delete process.env.WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  });

  it("returns ok when the database is reachable", async () => {
    queryRaw.mockResolvedValue([{ ok: 1 }]);
    process.env.WECHAT_MINI_PROGRAM_APP_ID = "wx_app_id";
    process.env.WECHAT_MINI_PROGRAM_APP_SECRET = "wx_app_secret";
    process.env.VERCEL_GIT_COMMIT_SHA = "abcdef123456";

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(ensureDatabaseSchema).toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalled();
    expect(data.status).toBe("ok");
    expect(data.checks.database.status).toBe("ok");
    expect(data.checks.wechatMiniProgram).toMatchObject({
      status: "configured",
      appIdConfigured: true,
      appSecretConfigured: true,
      mockLoginEnabled: false,
    });
    expect(data.version).toBe("abcdef1");
  });

  it("returns degraded when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(ensureDatabaseSchema).not.toHaveBeenCalled();
    expect(queryRaw).not.toHaveBeenCalled();
    expect(data.status).toBe("degraded");
    expect(data.checks.database.status).toBe("missing_configuration");
  });

  it("returns degraded when the database check fails", async () => {
    queryRaw.mockRejectedValue(new Error("connection failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.checks.database.status).toBe("error");
    expect(data.checks.wechatMiniProgram.status).toBe("missing_configuration");
    consoleError.mockRestore();
  });

  it("reports whether mock mini program login is enabled outside production", async () => {
    queryRaw.mockResolvedValue([{ ok: 1 }]);
    process.env.WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED = "true";

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.checks.wechatMiniProgram.mockLoginEnabled).toBe(true);
  });
});
