import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

type CheckResult = {
  label: string;
  ok: boolean;
  detail?: string;
  level: "error" | "warn";
};

type ProjectConfig = {
  appid?: string;
  compileType?: string;
  miniprogramRoot?: string;
  setting?: {
    urlCheck?: boolean;
  };
};

type AppJson = {
  pages?: string[];
  tabBar?: {
    list?: Array<{
      pagePath?: string;
    }>;
  };
};

const projectRoot = process.cwd();
const requireFromProject = createRequire(path.join(projectRoot, "package.json"));
const miniprogramRoot = path.join(projectRoot, "miniprogram");
const srcRoot = path.join(miniprogramRoot, "src");
const strict = process.argv.includes("--strict");
const remote = process.argv.includes("--remote");
const results: CheckResult[] = [];

function addResult(result: CheckResult) {
  results.push(result);
}

function check(label: string, ok: boolean, detail?: string) {
  addResult({
    label,
    ok,
    detail,
    level: "error",
  });
}

function warn(label: string, ok: boolean, detail?: string) {
  addResult({
    label,
    ok,
    detail,
    level: "warn",
  });
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function readText(filePath: string) {
  return readFileSync(filePath, "utf8");
}

function hasAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function looksLikeWechatAppId(value: string) {
  return /^wx[a-zA-Z0-9]{10,}$/.test(value.trim());
}

function describeRemoteError(error: unknown, healthUrl: string) {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && "cause" in error ? error.cause : null;

  if (!cause) {
    return `url=${healthUrl}, error=${message}`;
  }

  if (cause instanceof Error) {
    return `url=${healthUrl}, error=${message}, cause=${cause.message}`;
  }

  if (typeof cause === "object") {
    const details = Object.entries(cause as Record<string, unknown>)
      .filter(([key]) => ["code", "errno", "syscall", "hostname", "host", "port"].includes(key))
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(", ");

    return `url=${healthUrl}, error=${message}${details ? `, cause=${details}` : ""}`;
  }

  return `url=${healthUrl}, error=${message}, cause=${String(cause)}`;
}

const requiredPages = [
  "pages/login/login",
  "pages/today/today",
  "pages/dashboard/dashboard",
  "pages/trends/trends",
  "pages/me/me",
  "pages/legal/legal",
];

const requiredTabPages = [
  "pages/today/today",
  "pages/dashboard/dashboard",
  "pages/trends/trends",
  "pages/me/me",
];

const projectConfigPath = path.join(miniprogramRoot, "project.config.json");
const appJsonPath = path.join(srcRoot, "app.json");
const configPath = path.join(srcRoot, "config.js");
const projectConfig = readJson<ProjectConfig>(projectConfigPath);
const appJson = readJson<AppJson>(appJsonPath);

check("miniprogram/project.config.json exists", existsSync(projectConfigPath));
check("miniprogram/src/app.json exists", existsSync(appJsonPath));
check("miniprogram/src/config.js exists", existsSync(configPath));
check(
  "project compileType is miniprogram",
  projectConfig?.compileType === "miniprogram",
  `compileType=${projectConfig?.compileType ?? "missing"}`,
);
check(
  "project miniprogramRoot points to src/",
  projectConfig?.miniprogramRoot === "src/",
  `miniprogramRoot=${projectConfig?.miniprogramRoot ?? "missing"}`,
);
check(
  "URL check is enabled for real request-domain validation",
  projectConfig?.setting?.urlCheck === true,
);

for (const page of requiredPages) {
  for (const extension of ["js", "json", "wxml", "wxss"]) {
    check(
      `${page}.${extension} exists`,
      existsSync(path.join(srcRoot, `${page}.${extension}`)),
    );
  }
}

check(
  "app.json defines the alpha page set in order",
  JSON.stringify(appJson?.pages) === JSON.stringify(requiredPages),
  `pages=${JSON.stringify(appJson?.pages ?? [])}`,
);
check(
  "tabBar only exposes the four core app pages",
  JSON.stringify(appJson?.tabBar?.list?.map((item) => item.pagePath)) ===
    JSON.stringify(requiredTabPages),
);

const config = requireFromProject(configPath) as {
  apiBaseUrl?: string;
  mockLoginEnabled?: boolean;
};
const apiBaseUrl = config.apiBaseUrl ?? "";
check("apiBaseUrl is configured", typeof apiBaseUrl === "string" && apiBaseUrl.length > 0);
check(
  "apiBaseUrl uses HTTPS",
  typeof apiBaseUrl === "string" && apiBaseUrl.startsWith("https://"),
  `apiBaseUrl=${apiBaseUrl || "missing"}`,
);
warn(
  "apiBaseUrl points to the current production host",
  apiBaseUrl === "https://health-tracker-web-umber.vercel.app",
  `apiBaseUrl=${apiBaseUrl || "missing"}`,
);
warn(
  "mock login button is disabled by default",
  config.mockLoginEnabled !== true,
);

const apiHelper = readText(path.join(srcRoot, "utils", "api.js"));
const loginJs = readText(path.join(srcRoot, "pages", "login", "login.js"));
const loginWxml = readText(path.join(srcRoot, "pages", "login", "login.wxml"));
const todayJs = readText(path.join(srcRoot, "pages", "today", "today.js"));
const todayWxml = readText(path.join(srcRoot, "pages", "today", "today.wxml"));
const dashboardJs = readText(path.join(srcRoot, "pages", "dashboard", "dashboard.js"));
const dashboardWxml = readText(path.join(srcRoot, "pages", "dashboard", "dashboard.wxml"));
const trendsJs = readText(path.join(srcRoot, "pages", "trends", "trends.js"));
const trendsWxml = readText(path.join(srcRoot, "pages", "trends", "trends.wxml"));
const meJs = readText(path.join(srcRoot, "pages", "me", "me.js"));
const meWxml = readText(path.join(srcRoot, "pages", "me", "me.wxml"));
const legalJs = readText(path.join(srcRoot, "pages", "legal", "legal.js"));

check("API helper sends bearer token", apiHelper.includes("Authorization: `Bearer ${token}`"));
check("API helper clears invalid sessions on 401", hasAll(apiHelper, ["statusCode === 401", "clearAuth()"]));
check(
  "API helper returns actionable request diagnostics",
  hasAll(apiHelper, ["makeRequestError", "toErrorState", "HTTP ${response.statusCode}", "request 合法域名"]),
);
check(
  "login requires legal consent before wx.login",
  hasAll(loginJs, ["acceptedLegal", "请先同意隐私保护指引和用户协议", "wx.login"]),
);
check(
  "login supports explicitly configured mock-login testing",
  hasAll(loginJs, ["mockLoginEnabled", "handleMockLogin", "mock:"]),
);
check("login exposes legal links", hasAll(loginWxml, ["隐私保护指引", "用户协议", "健康免责声明"]));
check("today page reads and saves records", hasAll(todayJs, ["/api/records/today", "/api/records/${date}"]));
check("today page keeps weight-first alpha flow", hasAll(todayJs, ["qualityWarnings", "goDashboard", "completionSteps"]));
check(
  "today page shows record quality and dashboard CTA",
  hasAll(todayWxml, ["recordFocusLabel", "qualityWarnings", "看概览", "chip-label", "button-label"]) &&
    !todayWxml.includes('<button class="primary-button save-button"'),
);
check(
  "today page supports save/load retry diagnostics",
  hasAll(todayJs, ["toErrorState", "retryLastAction", "errorRetryAction"]) &&
    hasAll(todayWxml, ["errorDetail", "errorRetryLabel"]),
);
check("dashboard page reads summary", dashboardJs.includes("/api/dashboard"));
check("dashboard page surfaces action insights", hasAll(dashboardJs, ["actionCards", "weightContext", "handleAction"]));
check("dashboard page shows weekly focus and weight context", hasAll(dashboardWxml, ["今天先看", "体重线索", "今日三项"]));
check(
  "dashboard page supports load retry diagnostics",
  hasAll(dashboardJs, ["toErrorState", "retryLastAction"]) &&
    hasAll(dashboardWxml, ["errorDetail", "errorRetryLabel"]),
);
check("trends page reads weight trend", trendsJs.includes("/api/trends?metric=weight"));
check("trends page surfaces insight, comparison, and context", hasAll(trendsJs, ["buildInsight", "buildComparison", "buildSparkPoints", "buildTrendAction"]));
check("trends page shows weight trend review flow", hasAll(trendsWxml, ["趋势洞察", "最近走势", "体重线索", "最近记录"]));
check(
  "trends page supports load retry diagnostics",
  hasAll(trendsJs, ["toErrorState", "retryLastAction"]) &&
    hasAll(trendsWxml, ["errorDetail", "errorRetryLabel"]),
);
check("me page supports account export and deletion", hasAll(meJs, ["/api/account/export", "/api/account"]));
check(
  "me page records pay intent exposure and clicks",
  hasAll(meJs, ["/api/intent/pay", 'action: "shown"', 'action: "clicked"']),
);
check("me page submits feedback", hasAll(meJs, ["/api/feedback", "submitFeedback"]));
check("me page closes daily loop", hasAll(meJs, ["alphaTaskItems", "reportReasonItems", "handleAlphaTask"]));
check(
  "me page supports settings retry diagnostics",
  hasAll(meJs, ["toErrorState", "retryLastAction", "errorRetryAction"]) &&
    hasAll(meWxml, ["errorDetail", "errorRetryLabel"]),
);
check("me page exposes legal links", hasAll(meWxml, ["协议与说明", "隐私保护指引", "用户协议", "健康免责声明"]));
check("me page exposes feedback card", meWxml.includes("使用反馈"));
check("me page shows daily path and waitlist", hasAll(meWxml, ["日常路径", "30 天体重回看", "REPORT"]));
check("legal page includes privacy, terms, and health disclaimer", hasAll(legalJs, ["privacy", "terms", "health"]));

if (strict) {
  check(
    "project.config.json uses a real AppID",
    Boolean(projectConfig?.appid && projectConfig.appid !== "touristappid" && looksLikeWechatAppId(projectConfig.appid)),
    `appid=${projectConfig?.appid ?? "missing"}`,
  );

  if (!remote) {
    check(
      "WECHAT_MINI_PROGRAM_APP_ID is available for backend login",
      Boolean(process.env.WECHAT_MINI_PROGRAM_APP_ID && looksLikeWechatAppId(process.env.WECHAT_MINI_PROGRAM_APP_ID)),
    );
    check(
      "WECHAT_MINI_PROGRAM_APP_SECRET is available for backend login",
      Boolean(process.env.WECHAT_MINI_PROGRAM_APP_SECRET),
    );
    if (process.env.WECHAT_MINI_PROGRAM_APP_ID && process.env.WECHAT_MINI_PROGRAM_APP_SECRET) {
      check(
        "WECHAT_MINI_PROGRAM_APP_SECRET is not the AppID",
        process.env.WECHAT_MINI_PROGRAM_APP_SECRET !== process.env.WECHAT_MINI_PROGRAM_APP_ID,
      );
    }
  } else {
    warn(
      "local WeChat backend env is not required for remote Experience check",
      true,
      "remote /api/health verifies the Vercel runtime configuration",
    );
  }
}

type RemoteHealthPayload = {
  status?: string;
  checks?: {
    database?: {
      status?: string;
    };
    wechatMiniProgram?: {
      status?: string;
    };
  };
};

async function checkRemoteHealth() {
  if (!apiBaseUrl) {
    check("remote API health endpoint responds", false, "apiBaseUrl is missing");
    return;
  }

  const healthUrl = `${apiBaseUrl.replace(/\/$/, "")}/api/health`;

  try {
    const response = await fetch(healthUrl, {
      headers: {
        Accept: "application/json",
      },
    });
    const payload = (await response.json().catch(() => null)) as RemoteHealthPayload | null;

    check(
      "remote API health endpoint responds",
      response.ok && payload?.status === "ok",
      `url=${healthUrl}, status=${response.status}, health=${payload?.status ?? "missing"}`,
    );
    check(
      "remote database check is ok",
      payload?.checks?.database?.status === "ok",
      `url=${healthUrl}, database=${payload?.checks?.database?.status ?? "missing"}`,
    );

    if (strict) {
      check(
        "remote WeChat backend credentials are configured",
        payload?.checks?.wechatMiniProgram?.status === "configured",
        `url=${healthUrl}, wechatMiniProgram=${payload?.checks?.wechatMiniProgram?.status ?? "missing"}`,
      );
    }
  } catch (error) {
    check(
      "remote API health endpoint responds",
      false,
      describeRemoteError(error, healthUrl),
    );
  }
}

function printResultsAndExit() {
  let errorCount = 0;
  let warnCount = 0;

  for (const result of results) {
    const isStrictWarningFailure = strict && result.level === "warn" && !result.ok;
    const failed = !result.ok && (result.level === "error" || isStrictWarningFailure);

    if (failed) {
      errorCount += 1;
    } else if (!result.ok) {
      warnCount += 1;
    }

    const icon = result.ok ? "ok" : failed ? "fail" : "warn";
    const detail = result.detail ? ` (${result.detail})` : "";
    console.log(`[${icon}] ${result.label}${detail}`);
  }

  if (warnCount > 0 && !strict) {
    console.log(`\n${warnCount} warning(s). Run npm run miniprogram:check:strict before Experience build.`);
  }

  if (errorCount > 0) {
    console.error(`\nMini program check failed with ${errorCount} issue(s).`);
    process.exit(1);
  }

  console.log("\nMini program check passed.");
}

async function main() {
  if (remote) {
    await checkRemoteHealth();
  }

  printResultsAndExit();
}

void main();
