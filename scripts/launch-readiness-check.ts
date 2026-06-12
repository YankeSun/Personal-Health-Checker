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

function nextActionFor(result: CheckResult) {
  const label = result.label;

  if (label === "Vercel project is linked") {
    return "Run `vercel link` in the project root and link it to the existing health-tracker-web project.";
  }

  if (label === "Vercel project name matches health-tracker-web") {
    return "Re-run `vercel link` and select the existing `health-tracker-web` project instead of creating a new one.";
  }

  if (label === "mini program apiBaseUrl is HTTPS" || label === "mini program apiBaseUrl is not localhost") {
    return "Set `apiBaseUrl` in `miniprogram/src/config.js` to the HTTPS Vercel production domain that WeChat will request.";
  }

  if (label === "mini program mock login button is disabled for launch") {
    return "Keep `mockLoginEnabled: false` in `miniprogram/src/config.js` before uploading an Experience build.";
  }

  if (label === "mini program project uses a real AppID") {
    return "Copy the real AppID from the WeChat public platform and replace `touristappid` in `miniprogram/project.config.json`; it should look like `wx...`.";
  }

  if (label === "DATABASE_URL is configured locally") {
    return "Add a production-like Postgres `DATABASE_URL` to `.env.local` for local checks, and configure it in Vercel Production before release.";
  }

  if (label === "DATABASE_URL is not a localhost URL for launch") {
    return "Use the production Postgres URL for launch checks; localhost is only acceptable for internal development.";
  }

  if (label === "SESSION_SECRET is configured and not a placeholder") {
    return "Generate a strong session secret and set `SESSION_SECRET` locally and in Vercel Production. Do not commit the value.";
  }

  if (label === "WECHAT_MINI_PROGRAM_APP_ID is configured locally") {
    return "Set `WECHAT_MINI_PROGRAM_APP_ID` locally and in Vercel Production to the same real `wx...` AppID used by `project.config.json`.";
  }

  if (label === "WECHAT_MINI_PROGRAM_APP_SECRET is configured locally") {
    return "Set `WECHAT_MINI_PROGRAM_APP_SECRET` locally and in Vercel Production from the WeChat public platform. Do not commit it.";
  }

  if (label === "WECHAT_MINI_PROGRAM_APP_SECRET is not the AppID") {
    return "Copy the AppSecret from the WeChat public platform secret field; do not paste the AppID into `WECHAT_MINI_PROGRAM_APP_SECRET`.";
  }

  if (label === "EMAIL_FROM is configured for account email flows") {
    return "Optional for mini program alpha: configure `EMAIL_FROM` if Web email verification and password reset should send real email.";
  }

  if (label === "RESEND_API_KEY is configured for real email delivery") {
    return "Optional for mini program alpha: configure `RESEND_API_KEY` if Web email flows should use Resend in production.";
  }

  if (label === "WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED is not enabled for launch") {
    return "Remove `WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED=true` from launch environments before uploading or sharing an Experience build.";
  }

  if (label === "local WECHAT_MINI_PROGRAM_APP_ID matches project.config.json AppID") {
    return "Make `.env.local` and Vercel `WECHAT_MINI_PROGRAM_APP_ID` match `miniprogram/project.config.json` exactly.";
  }

  if (label.startsWith("Vercel ") && label.includes(" has ")) {
    const key = label.split(" has ").at(-1) ?? "the missing variable";
    return `Run \`vercel env add ${key} ${vercelEnvironment} --scope ${scope}\` or add it in the Vercel dashboard.`;
  }

  if (label === "Vercel environment variables can be listed") {
    const detail = result.detail?.toLowerCase() ?? "";

    if (detail.includes("network_unreachable")) {
      return "Fix DNS/proxy/direct-network access to vercel.com and registry.npmjs.org, then rerun the Vercel env check. `vercel login` is not enough if the network cannot reach Vercel.";
    }

    if (detail.includes("auth_or_scope")) {
      return "Run `vercel login`, confirm the `--scope` value, and make sure this account can access the linked Vercel project.";
    }

    return "Run `vercel login`, confirm the scope, and retry from a network that can reach vercel.com.";
  }

  if (label.endsWith(" exists")) {
    return "Restore or create this required readiness document before sharing the alpha with external testers.";
  }

  if (label === "privacy policy subject/contact placeholders resolved") {
    return "Replace privacy policy placeholders for operator name, contact method, effective date, and contact channel before sharing the Experience build.";
  }

  if (label === "user agreement contact/commercial placeholders resolved") {
    return "Fill the user agreement operator, customer support contact, dispute resolution, applicable law, and commercial terms before sharing the Experience build.";
  }

  if (label === "mini program submission legal checklist reviewed") {
    return "Review the submission checklist and mark legal placeholders as resolved only after the WeChat public platform and legal copy are updated.";
  }

  if (label === "health disclaimer launch placeholders resolved") {
    return "Confirm the health disclaimer against the selected Mini Program category and remove draft-only launch placeholders before sharing the Experience build.";
  }

  return "Fix this item before using the build for external alpha testing.";
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

function looksLikeWechatAppId(value: string) {
  return /^wx[a-zA-Z0-9]{10,}$/.test(value.trim());
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

function findCompliancePlaceholders(filePath: string, placeholders: string[]) {
  const resolvedPath = path.join(projectRoot, filePath);

  if (!existsSync(resolvedPath)) {
    return [];
  }

  const text = readFileSync(resolvedPath, "utf8");

  return placeholders.filter((placeholder) => text.includes(placeholder));
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

function errorField(error: unknown, field: "message" | "stdout" | "stderr") {
  if (!error || typeof error !== "object") {
    return "";
  }

  const value = (error as Record<string, unknown>)[field];

  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }

  return typeof value === "string" ? value : "";
}

function describeVercelEnvListError(error: unknown) {
  const raw = [
    errorField(error, "message"),
    errorField(error, "stderr"),
    errorField(error, "stdout"),
  ]
    .filter(Boolean)
    .join("\n");
  const lower = raw.toLowerCase();
  const reason =
    /enotfound|econnreset|etimedout|eai_again|tls|ssl|network socket|request to .* failed/.test(lower)
      ? "network_unreachable"
      : /login|unauth|forbidden|permission|scope|not able to load user|token|401|403/.test(lower)
        ? "auth_or_scope"
        : "unknown";
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const networkLine = lines.find((line) =>
    /enotfound|econnreset|etimedout|eai_again|network socket|request to .* failed/i.test(line),
  );
  const authLine = lines.find((line) =>
    /not able to load user|forbidden|unauth|permission|token|401|403/i.test(line),
  );
  const usefulLine =
    reason === "network_unreachable"
      ? networkLine ?? authLine ?? lines[0] ?? "Vercel CLI returned no diagnostic output"
      : reason === "auth_or_scope"
        ? authLine ?? lines[0] ?? "Vercel CLI returned no diagnostic output"
        : lines[0] ?? "Vercel CLI returned no diagnostic output";

  return `${reason}: ${usefulLine.slice(0, 260)}`;
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
  Boolean(projectConfig?.appid && projectConfig.appid !== "touristappid" && looksLikeWechatAppId(projectConfig.appid)),
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
  notPlaceholder("WECHAT_MINI_PROGRAM_APP_ID", ["wx_xxx"]) &&
    looksLikeWechatAppId(envValue("WECHAT_MINI_PROGRAM_APP_ID")),
);
blocker(
  "WECHAT_MINI_PROGRAM_APP_SECRET is configured locally",
  notPlaceholder("WECHAT_MINI_PROGRAM_APP_SECRET", ["wechat_secret_xxx"]),
);
if (configured("WECHAT_MINI_PROGRAM_APP_ID") && configured("WECHAT_MINI_PROGRAM_APP_SECRET")) {
  blocker(
    "WECHAT_MINI_PROGRAM_APP_SECRET is not the AppID",
    envValue("WECHAT_MINI_PROGRAM_APP_SECRET") !== envValue("WECHAT_MINI_PROGRAM_APP_ID"),
    "AppSecret value is compared locally without printing it",
  );
}
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
  "research/WECHAT_COMPETITOR_FIELDWORK.md",
  "research/WECHAT_COMPETITOR_SYNTHESIS.md",
  "research/alpha/ALPHA_BATCH_CONTROL.md",
  "research/alpha/ALPHA_USER_EVIDENCE.md",
  "research/alpha/PHONE_TEST_SESSION_TEMPLATE.md",
  "WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md",
]) {
  blocker(`${filePath} exists`, existsSync(path.join(projectRoot, filePath)));
}

const compliancePlaceholderRules: Array<{
  label: string;
  filePath: string;
  severity: Severity;
  placeholders: string[];
}> = [
  {
    label: "privacy policy subject/contact placeholders resolved",
    filePath: "compliance/PRIVACY_POLICY_DRAFT.md",
    severity: "blocker",
    placeholders: [
      "运营主体：待填写",
      "联系方式：待填写",
      "生效日期：待填写",
      "待填写联系方式",
    ],
  },
  {
    label: "user agreement contact/commercial placeholders resolved",
    filePath: "compliance/USER_AGREEMENT_DRAFT.md",
    severity: "blocker",
    placeholders: [
      "运营主体、客服邮箱、争议解决方式和适用法律待正式上线前填写",
      "收费模式",
    ],
  },
  {
    label: "mini program submission legal checklist reviewed",
    filePath: "compliance/MINIPROGRAM_SUBMISSION_CHECKLIST.md",
    severity: "warn",
    placeholders: [
      "主体、联系方式和第三方服务清单",
      "收费规则占位",
    ],
  },
  {
    label: "health disclaimer launch placeholders resolved",
    filePath: "compliance/HEALTH_DISCLAIMER_DRAFT.md",
    severity: "warn",
    placeholders: [
      "正式上线前需结合实际类目和审核要求确认",
    ],
  },
];

for (const rule of compliancePlaceholderRules) {
  const matches = findCompliancePlaceholders(rule.filePath, rule.placeholders);
  const detail = matches.length > 0
    ? `${rule.filePath}: ${matches.join(", ")}`
    : rule.filePath;

  addCheck(rule.label, matches.length === 0, rule.severity, detail);
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
      describeVercelEnvListError(error),
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

const openItems = results.filter((result) => !result.ok);

if (openItems.length > 0) {
  console.log("\nNext actions:");

  openItems.forEach((result, index) => {
    const severity = result.severity === "blocker" ? "blocker" : "warning";
    console.log(`${index + 1}. [${severity}] ${result.label}: ${nextActionFor(result)}`);
  });
}

if (blockers > 0 && !strict) {
  console.log("Run with --strict when you want blockers to fail the command.");
}

if (blockers > 0 && strict) {
  process.exit(1);
}
