import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const host = getArgValue("--host") ?? "127.0.0.1";
const port = Number(getArgValue("--port") ?? process.env.MINIPROGRAM_SMOKE_PORT ?? 3300);
const timeoutMs = Number(getArgValue("--timeout-ms") ?? 60_000);
const mockCode = getArgValue("--mock-code") ?? `mock:alpha-local-smoke-${Date.now()}`;
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

function startServer() {
  printStep(`starting Next dev server at ${baseUrl}`);

  serverProcess = spawn(
    npmCommand,
    ["run", "dev", "--", "--hostname", host, "--port", String(port)],
    {
      cwd: process.cwd(),
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED: "true",
      },
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
      env: {
        ...process.env,
        WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED: "true",
      },
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
