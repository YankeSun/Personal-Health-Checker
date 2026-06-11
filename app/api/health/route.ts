import { prisma } from "@/lib/db";
import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "error" | "missing_configuration" | "configured";

type HealthCheck = {
  status: CheckStatus;
  latencyMs?: number;
};

async function checkDatabase(): Promise<HealthCheck> {
  if (!process.env.DATABASE_URL) {
    return {
      status: "missing_configuration",
    };
  }

  const startedAt = Date.now();

  try {
    await ensureDatabaseSchema();
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    console.error("health database check failed", error);

    return {
      status: "error",
      latencyMs: Date.now() - startedAt,
    };
  }
}

export async function GET() {
  const database = await checkDatabase();
  const appIdConfigured = Boolean(process.env.WECHAT_MINI_PROGRAM_APP_ID);
  const appSecretConfigured = Boolean(process.env.WECHAT_MINI_PROGRAM_APP_SECRET);
  const wechatMiniProgram = {
    status:
      appIdConfigured && appSecretConfigured
        ? "configured"
        : "missing_configuration",
    appIdConfigured,
    appSecretConfigured,
  };
  const status = database.status === "ok" ? "ok" : "degraded";
  const httpStatus = status === "ok" ? 200 : 503;

  return Response.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database,
        wechatMiniProgram,
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
