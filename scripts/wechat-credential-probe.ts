type ProbeStatus = "pass" | "review" | "fail";

type ProbeResult = {
  label: string;
  status: ProbeStatus;
  detail: string;
};

const appIdEnv = getArgValue("--app-id-env") ?? "WECHAT_MINI_PROGRAM_APP_ID";
const secretEnv = getArgValue("--secret-env") ?? "WECHAT_MINI_PROGRAM_APP_SECRET";
const jsCodeEnv = getArgValue("--js-code-env") ?? "WECHAT_LOGIN_CODE";
const strict = process.argv.includes("--strict");
const appId = process.env[appIdEnv]?.trim() ?? "";
const secret = process.env[secretEnv]?.trim() ?? "";
const jsCode = process.env[jsCodeEnv]?.trim() ?? "";
const results: ProbeResult[] = [];

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function maskAppId(value: string) {
  if (value.length <= 8) {
    return "missing";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function addResult(label: string, status: ProbeStatus, detail: string) {
  results.push({
    label,
    status,
    detail,
  });
}

function statusIcon(status: ProbeStatus) {
  if (status === "pass") return "ok";
  if (status === "review") return "review";
  return "fail";
}

function looksLikeWechatAppId(value: string) {
  return /^wx[a-zA-Z0-9]{10,}$/.test(value);
}

async function fetchJson(url: URL) {
  const response = await fetch(url);

  return response.json() as Promise<Record<string, unknown>>;
}

function errcode(data: Record<string, unknown>) {
  return typeof data.errcode === "number" ? data.errcode : null;
}

function errmsg(data: Record<string, unknown>) {
  return typeof data.errmsg === "string" ? data.errmsg : "no errmsg";
}

function classifyCommonWechatError(code: number | null, message: string) {
  if (code === 40013) {
    return {
      status: "fail" as const,
      detail: "invalid AppID. Confirm this is the Mini Program AppID from the Mini Program backend.",
    };
  }

  if (code === 40125) {
    return {
      status: "fail" as const,
      detail: "invalid AppSecret. Confirm the secret is copied from the matching Mini Program backend.",
    };
  }

  if (code === 40164) {
    return {
      status: "review" as const,
      detail: `IP whitelist blocked this request. The credential may be recognized, but the current IP is not allowed. WeChat says: ${message}`,
    };
  }

  return null;
}

async function probeAccessToken() {
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");

  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", secret);

  try {
    const data = await fetchJson(url);

    if (typeof data.access_token === "string") {
      addResult(
        "access token endpoint",
        "pass",
        `access token received; expires_in=${String(data.expires_in ?? "unknown")}`,
      );
      return;
    }

    const commonError = classifyCommonWechatError(errcode(data), errmsg(data));

    if (commonError) {
      addResult("access token endpoint", commonError.status, commonError.detail);
      return;
    }

    addResult(
      "access token endpoint",
      "review",
      `WeChat returned errcode=${String(errcode(data))}, errmsg=${errmsg(data)}`,
    );
  } catch (error) {
    addResult(
      "access token endpoint",
      "fail",
      `network or fetch error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function probeCode2Session() {
  const codeForProbe = jsCode || "codex_invalid_probe_code";
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");

  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", secret);
  url.searchParams.set("js_code", codeForProbe);
  url.searchParams.set("grant_type", "authorization_code");

  try {
    const data = await fetchJson(url);

    if (typeof data.openid === "string") {
      addResult(
        "mini program code2Session",
        "pass",
        "real wx.login code exchanged successfully; openid was received and not printed",
      );
      return;
    }

    const commonError = classifyCommonWechatError(errcode(data), errmsg(data));

    if (commonError) {
      addResult("mini program code2Session", commonError.status, commonError.detail);
      return;
    }

    if (errcode(data) === 40029 && !jsCode) {
      addResult(
        "mini program code2Session",
        "review",
        "invalid js_code is expected for the built-in fake probe. This does not prove Mini Program readiness; rerun with a real wx.login code to verify end to end.",
      );
      return;
    }

    addResult(
      "mini program code2Session",
      "review",
      `WeChat returned errcode=${String(errcode(data))}, errmsg=${errmsg(data)}`,
    );
  } catch (error) {
    addResult(
      "mini program code2Session",
      "fail",
      `network or fetch error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (!appId || !secret) {
  console.error(
    `[wechat-probe] Missing credentials. Export ${appIdEnv} and ${secretEnv}; do not commit them.`,
  );
  process.exit(1);
}

if (!looksLikeWechatAppId(appId)) {
  console.error(`[wechat-probe] ${appIdEnv} does not look like a wx... AppID.`);
  process.exit(1);
}

if (appId === secret) {
  console.error(`[wechat-probe] ${secretEnv} must not equal ${appIdEnv}.`);
  process.exit(1);
}

console.log(`[wechat-probe] AppID=${maskAppId(appId)}`);
console.log(
  jsCode
    ? "[wechat-probe] Real wx.login code provided through env; code will not be printed."
    : "[wechat-probe] No real wx.login code provided; code2Session will use a fake code and can only produce a review signal.",
);

async function main() {
  await probeAccessToken();
  await probeCode2Session();

  for (const result of results) {
    console.log(`[${statusIcon(result.status)}] ${result.label}: ${result.detail}`);
  }

  const failures = results.filter((result) => result.status === "fail");
  const reviews = results.filter((result) => result.status === "review");

  if (failures.length > 0 || (strict && reviews.length > 0)) {
    process.exit(1);
  }
}

void main();
