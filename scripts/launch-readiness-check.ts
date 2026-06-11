import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Severity = "blocker" | "warn";

type CheckResult = {
  label: string;
  ok: boolean;
  severity: Severity;
  detail?: string;
};

type ProjectConfig = {
  appid?: string;
};

type VercelProject = {
  projectName?: string;
};

const projectRoot = process.cwd();
const strict = process.argv.includes("--strict");
const checkVercel = process.argv.includes("--vercel");
const scope = getArgValue("--scope") ?? process.env.VERCEL_SCOPE ?? "yankesuns-projects";
const vercelEnvironment = getArgValue("--environment") ?? "production";
const results: CheckResult[] = [];
const envValues = {
  ...readEnvFile(path.join(projectRoot, ".env")),
  ...readEnvFile(path.join(projectRoot, ".env.local")),
  ...process.env,
};

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function addCheck(label: string, ok: boolean, severity: Severity, detail?: string) {
  results.push({
    label,
    ok,
    severity,
    detail,
  });
}

function blocker(label: string, ok: boolean, detail?: string) {
  addCheck(label, ok, "blocker", detail);
}

function warn(label: string, ok: boolean, detail?: string) {
  addCheck(label, ok, "warn", detail);
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function readEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return {};
  }

  const values: Record<string, string> = {};

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const rawValue = line.slice(equalsIndex + 1).trim();
    values[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return values;
}

function envValue(key: string) {
  return envValues[key] ?? "";
}

function configured(key: string) {
  return envValue(key).trim().length > 0;
}

function notPlaceholder(key: string, placeholders: string[]) {
  const value = envValue(key).trim();

  return Boolean(value) && !placeholders.some((placeholder) => value.includes(placeholder));
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const keyField of ["key", "name"]) {
      const envName = record[keyField];

      if (typeof envName === "string") {
        keys.add(envName);
      }
    }

    for (const nested of Object.values(record)) {
      collectKeys(nested, keys);
    }
  }

  return keys;
}

function listVercelEnvKeys(environment: string) {
  const stdout = execFileSync(
    "vercel",
    [
      "env",
      "ls",
      environment,
      "--scope",
      scope,
      "--format",
      "json",
      "--cwd",
      projectRoot,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  return collectKeys(JSON.parse(stdout));
}

const projectConfig = readJson<ProjectConfig>(
  path.join(projectRoot, "miniprogram", "project.config.json"),
);
const vercelProject = readJson<VercelProject>(
  path.join(projectRoot, ".vercel", "project.json"),
);
const miniProgramConfig = readFileSync(
  path.join(projectRoot, "miniprogram", "src", "config.js"),
  "utf8",
);
const apiBaseUrlMatch = miniProgramConfig.match(/apiBaseUrl:\s*["']([^"']+)["']/);
const apiBaseUrl = apiBaseUrlMatch?.[1] ?? "";
const mockLoginEnabledInMiniProgram =
  /mockLoginEnabled:\s*true/.test(miniProgramConfig);

blocker("Vercel project is linked", Boolean(vercelProject?.projectName), ".vercel/project.json");
warn(
  "Vercel project name matches health-tracker-web",
  vercelProject?.projectName === "health-tracker-web",
  `projectName=${vercelProject?.projectName ?? "missing"}`,
);
blocker("mini program apiBaseUrl is HTTPS", apiBaseUrl.startsWith("https://"), `apiBaseUrl=${apiBaseUrl || "missing"}`);
warn("mini program apiBaseUrl is not localhost", !apiBaseUrl.includes("localhost"), `apiBaseUrl=${apiBaseUrl || "missing"}`);
blocker(
  "mini program mock login button is disabled for launch",
  !mockLoginEnabledInMiniProgram,
);
blocker(
  "mini program project uses a real AppID",
  Boolean(projectConfig?.appid && projectConfig.appid !== "touristappid"),
  `appid=${projectConfig?.appid ?? "missing"}`,
);

blocker("DATABASE_URL is configured locally", configured("DATABASE_URL"));
warn("DATABASE_URL is not a localhost URL for launch", !envValue("DATABASE_URL").includes("localhost"));
blocker(
  "SESSION_SECRET is configured and not a placeholder",
  notPlaceholder("SESSION_SECRET", ["replace-with", "change-me", "secret"]),
);
blocker(
  "WECHAT_MINI_PROGRAM_APP_ID is configured locally",
  notPlaceholder("WECHAT_MINI_PROGRAM_APP_ID", ["wx_xxx"]),
);
blocker(
  "WECHAT_MINI_PROGRAM_APP_SECRET is configured locally",
  notPlaceholder("WECHAT_MINI_PROGRAM_APP_SECRET", ["wechat_secret_xxx"]),
);
warn("EMAIL_FROM is configured for account email flows", configured("EMAIL_FROM"));
warn(
  "RESEND_API_KEY is configured for real email delivery",
  notPlaceholder("RESEND_API_KEY", ["re_xxx"]),
);
blocker(
  "WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED is not enabled for launch",
  envValue("WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED") !== "true",
);

if (configured("WECHAT_MINI_PROGRAM_APP_ID") && projectConfig?.appid) {
  blocker(
    "local WECHAT_MINI_PROGRAM_APP_ID matches project.config.json AppID",
    envValue("WECHAT_MINI_PROGRAM_APP_ID") === projectConfig.appid,
  );
}

for (const filePath of [
  "compliance/PRIVACY_POLICY_DRAFT.md",
  "compliance/USER_AGREEMENT_DRAFT.md",
  "compliance/HEALTH_DISCLAIMER_DRAFT.md",
  "miniprogram/ALPHA_RELEASE_PACK.md",
  "miniprogram/TESTING_CHECKLIST.md",
  "WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md",
]) {
  blocker(`${filePath} exists`, existsSync(path.join(projectRoot, filePath)));
}

if (checkVercel) {
  try {
    const vercelEnvKeys = listVercelEnvKeys(vercelEnvironment);

    for (const key of [
      "DATABASE_URL",
      "SESSION_SECRET",
      "WECHAT_MINI_PROGRAM_APP_ID",
      "WECHAT_MINI_PROGRAM_APP_SECRET",
    ]) {
      blocker(
        `Vercel ${vercelEnvironment} has ${key}`,
        vercelEnvKeys.has(key),
      );
    }

    for (const key of ["EMAIL_FROM", "RESEND_API_KEY"]) {
      warn(`Vercel ${vercelEnvironment} has ${key}`, vercelEnvKeys.has(key));
    }
  } catch (error) {
    blocker(
      "Vercel environment variables can be listed",
      false,
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

let blockers = 0;
let warnings = 0;

for (const result of results) {
  const isFailure = !result.ok;

  if (isFailure && result.severity === "blocker") {
    blockers += 1;
  }

  if (isFailure && result.severity === "warn") {
    warnings += 1;
  }

  const icon = result.ok ? "ok" : result.severity;
  const detail = result.detail ? ` (${result.detail})` : "";
  console.log(`[${icon}] ${result.label}${detail}`);
}

console.log(`\nLaunch readiness: ${blockers} blocker(s), ${warnings} warning(s).`);

if (blockers > 0 && !strict) {
  console.log("Run with --strict when you want blockers to fail the command.");
}

if (blockers > 0 && strict) {
  process.exit(1);
}
