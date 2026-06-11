import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import {
  describeDatabaseUrl,
  getEnvFileValue,
  resolveNextLikeEnvValue,
} from "./env-diagnostics";

const databaseUrlEnvKey = getArgValue("--database-url-env");
const timeoutMs = Number(getArgValue("--timeout-ms") ?? 10_000);
const requireFromScript = createRequire(import.meta.url);
const { Client } = requireFromScript("pg") as {
  Client: new (config: {
    connectionString: string;
    connectionTimeoutMillis: number;
  }) => {
    connect: () => Promise<void>;
    query: (sql: string) => Promise<unknown>;
    end: () => Promise<void>;
  };
};

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function print(message: string) {
  console.log(`[db-doctor] ${message}`);
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = "cause" in error ? error.cause : null;

  if (!cause || typeof cause !== "object") {
    return error.message;
  }

  const causeDetails = Object.entries(cause as Record<string, unknown>)
    .filter(([key]) => ["code", "errno", "syscall", "hostname", "host", "port"].includes(key))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");

  return `${error.message}${causeDetails ? ` (${causeDetails})` : ""}`;
}

function dockerAvailable() {
  const result = spawnSync("docker", ["--version"], {
    encoding: "utf8",
  });

  return result.status === 0;
}

async function main() {
  const resolved = databaseUrlEnvKey
    ? {
        key: databaseUrlEnvKey,
        value: process.env[databaseUrlEnvKey] ?? getEnvFileValue(databaseUrlEnvKey).value,
        source: `--database-url-env ${databaseUrlEnvKey}`,
      }
    : resolveNextLikeEnvValue("DATABASE_URL");
  const database = describeDatabaseUrl(resolved.value);

  print(`${resolved.key} source=${resolved.source ?? "missing"}`);
  print(`${resolved.key} target host=${database.host}, database=${database.database}`);

  if (!resolved.value) {
    throw new Error(`${resolved.key} is missing. Configure .env.local or pass it in the shell.`);
  }

  if (database.isLocal) {
    print(`local database target detected, docker=${dockerAvailable() ? "available" : "missing"}`);
    print("if Postgres is not running, start it with: docker compose up -d postgres");
  } else {
    print("remote database target detected; verify network access, Neon status, and SSL settings if connection fails");
  }

  const client = new Client({
    connectionString: resolved.value,
    connectionTimeoutMillis: timeoutMs,
  });

  try {
    await client.connect();
    const startedAt = Date.now();
    await client.query("SELECT 1");
    print(`connection ok (${Date.now() - startedAt}ms query latency)`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[db-doctor] failed: ${describeError(error)}`);
  process.exit(1);
});
