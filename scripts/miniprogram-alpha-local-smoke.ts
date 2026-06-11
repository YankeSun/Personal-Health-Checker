import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import {
  describeDatabaseUrl,
  getEnvFileValue,
  resolveNextLikeEnvValue,
} from "./env-diagnostics";

const host = getArgValue("--host") ?? "127.0.0.1";
const port = Number(getArgValue("--port") ?? process.env.MINIPROGRAM_SMOKE_PORT ?? 3300);
const timeoutMs = Number(getArgValue("--timeout-ms") ?? 60_000);
const mockCode = getArgValue("--mock-code") ?? `mock:alpha-local-smoke-${Date.now()}`;
const databaseUrlEnvKey = getArgValue("--database-url-env");
const useDockerDb = process.argv.includes("--docker-db");
const dockerDatabaseUrl =
  getArgValue("--docker-database-url") ??
  "postgresql://postgres:postgres@127.0.0.1:5432/health_tracker?schema=public";
const shouldCleanup = !process.argv.includes("--no-cleanup");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const baseUrl = `http://${host}:${port}`;
let serverProcess: ChildProcess | null = null;

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function printStep(message: string) {
  console.log(`[mini-local-smoke] ${message}`);
}

function resolveSmokeDatabaseUrl() {
  if (databaseUrlEnvKey) {
    const databaseUrl = process.env[databaseUrlEnvKey] ?? getEnvFileValue(databaseUrlEnvKey).value;

    if (!databaseUrl) {
      throw new Error(`--database-url-env ${databaseUrlEnvKey} was provided, but no value was found`);
    }

    return databaseUrl;
  }

  if (useDockerDb) {
    return dockerDatabaseUrl;
  }

  return null;
}

function getServerEnv() {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED: "true",
  };
  const databaseUrl = resolveSmokeDatabaseUrl();

  if (databaseUrl) {
    env.DATABASE_URL = databaseUrl;
  }

  return env;
}

function printDatabaseTarget(env: NodeJS.ProcessEnv) {
  const resolved = env.DATABASE_URL
    ? {
        value: env.DATABASE_URL,
        source: databaseUrlEnvKey ? `--database-url-env ${databaseUrlEnvKey}` : "process.env",
      }
    : resolveNextLikeEnvValue("DATABASE_URL");
  const database = describeDatabaseUrl(resolved.value);

  printStep(
    `database target source=${resolved.source ?? "missing"}, host=${database.host}, database=${database.database}`,
  );

  if (database.isLocal) {
    printStep(
      useDockerDb
        ? "local Docker database target detected; script will start docker compose postgres"
        : "local database target detected; if it is not running, start Postgres before smoke",
    );
  } else if (resolved.value) {
    printStep("remote database target detected; network, Neon status, or SSL settings can block local smoke");
  }
}

function runSync(label: string, command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  printStep(label);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
    stdio: "pipe",
  });
  const spawnError = result.error instanceof Error ? result.error.message : "";
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit=${result.status ?? "unknown"}${spawnError ? ` (${spawnError})` : ""}${output ? `\n${output}` : ""}`,
    );
  }

  if (output) {
    console.log(output);
  }
}

async function prepareDockerDatabase() {
  if (!useDockerDb) {
    return;
  }

  runSync("checking Docker CLI", "docker", ["--version"]);
  runSync("starting Docker Postgres", "docker", ["compose", "up", "-d", "postgres"]);

  const env = getServerEnv();
  const deadline = Date.now() + timeoutMs;
  let lastError = "not checked";

  while (Date.now() < deadline) {
    const result = spawnSync(
      npmCommand,
      ["run", "db:doctor", "--", "--timeout-ms", "5000"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env,
        stdio: "pipe",
      },
    );
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

    if (result.status === 0) {
      printStep("Docker Postgres is reachable");
      if (output) {
        console.log(output);
      }
      return;
    }

    lastError = output || `exit=${result.status ?? "unknown"}`;
    await delay(1_000);
  }

  throw new Error(`Docker Postgres did not become reachable within ${timeoutMs}ms (${lastError})`);
}

function startServer() {
  printStep(`starting Next dev server at ${baseUrl}`);
  const serverEnv = getServerEnv();
  printDatabaseTarget(serverEnv);

  serverProcess = spawn(
    npmCommand,
    ["run", "dev", "--", "--hostname", host, "--port", String(port)],
    {
      cwd: process.cwd(),
      detached: process.platform !== "win32",
      env: serverEnv,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  serverProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(`[next-dev] ${String(chunk)}`);
  });
  serverProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(`[next-dev] ${String(chunk)}`);
  });
  serverProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[mini-local-smoke] Next dev exited with code ${code}`);
    } else if (signal) {
      printStep(`Next dev stopped with signal ${signal}`);
    }
  });
}

async function waitForHealth() {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not checked";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: {
          Accept: "application/json",
        },
      });
      const payload = (await response.json().catch(() => null)) as {
        status?: string;
        checks?: {
          database?: {
            status?: string;
            latencyMs?: number;
          };
          wechatMiniProgram?: {
            status?: string;
            mockLoginEnabled?: boolean;
          };
        };
      } | null;

      if (response.ok && payload?.status === "ok") {
        printStep("/api/health is ready");
        return;
      }

      lastError = [
        `status=${response.status}`,
        `health=${payload?.status ?? "missing"}`,
        `database=${payload?.checks?.database?.status ?? "missing"}`,
        `wechat=${payload?.checks?.wechatMiniProgram?.status ?? "missing"}`,
        `mockLogin=${String(payload?.checks?.wechatMiniProgram?.mockLoginEnabled ?? "missing")}`,
      ].join(", ");
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown error";
    }

    await delay(1_000);
  }

  throw new Error(`local API did not become ready within ${timeoutMs}ms (${lastError})`);
}

async function runSmoke() {
  const args = [
    "run",
    "miniprogram:smoke",
    "--",
    "--base-url",
    baseUrl,
    "--mock-code",
    mockCode,
  ];

  if (shouldCleanup) {
    args.push("--cleanup");
  }

  printStep(`running alpha smoke${shouldCleanup ? " with cleanup" : ""}`);

  await new Promise<void>((resolve, reject) => {
    const smoke = spawn(npmCommand, args, {
      cwd: process.cwd(),
      env: getServerEnv(),
      stdio: "inherit",
    });

    smoke.on("error", reject);
    smoke.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`alpha smoke exited with code ${code ?? "unknown"}`));
      }
    });
  });
}

function stopServer() {
  if (!serverProcess?.pid || serverProcess.exitCode !== null) {
    return;
  }

  printStep("stopping Next dev server");

  if (process.platform === "win32") {
    serverProcess.kill("SIGTERM");
    return;
  }

  try {
    process.kill(-serverProcess.pid, "SIGTERM");
  } catch {
    serverProcess.kill("SIGTERM");
  }
}

async function main() {
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`invalid --port value: ${String(port)}`);
  }

  await prepareDockerDatabase();
  startServer();
  await waitForHealth();
  await runSmoke();
  printStep("local mini program alpha smoke passed");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopServer();
    process.exit(1);
  });
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : "unknown error";

    console.error(`[mini-local-smoke] failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    stopServer();
  });
