import { createRequire } from "node:module";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const requireFromProject = createRequire(path.join(projectRoot, "package.json"));
const config = requireFromProject(
  path.join(projectRoot, "miniprogram", "src", "config.js"),
) as {
  apiBaseUrl?: string;
};

const baseUrl = (
  getArgValue("--base-url") ??
  process.env.BASE_URL ??
  config.apiBaseUrl ??
  "http://localhost:3000"
).replace(/\/$/, "");
const mockCode = getArgValue("--mock-code") ?? "mock:alpha-smoke";
const cleanup = process.argv.includes("--cleanup");

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function todayInShanghai() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function requestJson(pathname: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as JsonRecord | null;

  if (!response.ok) {
    const message = typeof payload?.error === "string"
      ? payload.error
      : `HTTP ${response.status}`;
    throw new Error(`${pathname} failed: ${message}`);
  }

  return payload ?? {};
}

async function authedJson(pathname: string, token: string, options: RequestInit = {}) {
  return requestJson(pathname, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function printStep(message: string) {
  console.log(`[mini-smoke] ${message}`);
}

async function main() {
  printStep(`target ${baseUrl}`);
  printStep("checking remote health");
  const health = await requestJson("/api/health");
  assert(health.status === "ok", `health status is ${String(health.status)}`);

  printStep("logging in with controlled mock code");
  const loginPayload = await requestJson("/api/mp/auth/wechat-login", {
    method: "POST",
    body: JSON.stringify({
      code: mockCode,
      displayName: "体验测试用户",
    }),
  });
  const token = loginPayload.token;

  assert(typeof token === "string" && token.length > 0, "login did not return bearer token");
  printStep(`login ok, isNewUser=${String(loginPayload.isNewUser)}`);

  printStep("loading today record");
  const todayPayload = await authedJson("/api/records/today", token);
  const record = todayPayload.record as JsonRecord | undefined;
  const recordDate = typeof record?.date === "string" ? record.date : todayInShanghai();

  printStep(`saving record for ${recordDate}`);
  const savedPayload = await authedJson(`/api/records/${recordDate}`, token, {
    method: "PUT",
    body: JSON.stringify({
      sleepHours: 7.5,
      weightKg: 68.4,
      waterMl: 1800,
      contextTags: {
        dietTags: ["NORMAL"],
        activityLevel: "NORMAL",
        energyLevel: "GOOD",
        weighTiming: "MORNING",
      },
    }),
  });

  assert(Boolean(savedPayload.record), "record save did not return record");

  printStep("loading dashboard");
  const dashboardPayload = await authedJson("/api/dashboard?days=7", token);
  assert(Boolean(dashboardPayload.dashboard), "dashboard payload missing");

  printStep("loading weight trend");
  const trendPayload = await authedJson("/api/trends?metric=weight&days=30", token);
  assert(Boolean(trendPayload.trend), "trend payload missing");

  printStep("loading profile and goals");
  const profilePayload = await authedJson("/api/profile", token);
  const goalsPayload = await authedJson("/api/goals", token);
  assert(Boolean(profilePayload.profile), "profile payload missing");
  assert(Array.isArray(goalsPayload.goals), "goals payload missing");

  printStep("exporting account data");
  const exportPayload = await authedJson("/api/account/export", token);
  assert(Array.isArray(exportPayload.dailyRecords), "account export missing dailyRecords");

  printStep("recording report beta intent");
  const intentPayload = await authedJson("/api/intent/pay", token, {
    method: "POST",
    body: JSON.stringify({
      offer: "WEIGHT_REPORT_30D",
      source: "wechat_mp/smoke",
    }),
  });
  assert(intentPayload.success === true, "pay intent did not return success");

  if (cleanup) {
    printStep("cleaning up smoke account");
    await authedJson("/api/account", token, {
      method: "DELETE",
    });
  }

  printStep("mini program alpha smoke passed");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown error";

  console.error(`[mini-smoke] failed: ${message}`);
  console.error("[mini-smoke] Tip: use a local or preview API with WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED=true.");
  process.exit(1);
});
