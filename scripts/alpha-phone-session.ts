import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const templatePath = path.join(projectRoot, "research", "alpha", "PHONE_TEST_SESSION_TEMPLATE.md");

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function gitValue(args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function extractApiBaseUrl() {
  const configPath = path.join(projectRoot, "miniprogram", "src", "config.js");

  if (!existsSync(configPath)) {
    return "";
  }

  const config = readFileSync(configPath, "utf8");

  return config.match(/apiBaseUrl:\s*["']([^"']+)["']/)?.[1] ?? "";
}

function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tester";
}

function replaceField(template: string, label: string, value: string) {
  return template.replace(new RegExp(`^- ${label}:.*$`, "m"), `- ${label}: ${value}`);
}

function localDate(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date());
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

const batch = getArgValue("--batch") ?? "Alpha-001";
const tester = getArgValue("--tester") ?? "internal-01";
const device = getArgValue("--device") ?? "";
const osVersion = getArgValue("--os") ?? "";
const wechatVersion = getArgValue("--wechat") ?? "";
const buildVersion = getArgValue("--build") ?? "";
const apiDomain = getArgValue("--api-domain") ?? extractApiBaseUrl();
const outPath =
  getArgValue("--out") ??
  path.join(
    "research",
    "alpha",
    "phone-sessions",
    `${batch}-${safeSlug(tester)}.md`,
  );
const projectConfig = readJson<{ appid?: string }>(
  path.join(projectRoot, "miniprogram", "project.config.json"),
);
const appId = projectConfig?.appid ?? "";
const today = localDate("Asia/Shanghai");
const gitCommit = gitValue(["rev-parse", "--short", "HEAD"]);
const template = readFileSync(templatePath, "utf8");

let session = template.replace("# Phone Test Session Template", `# Phone Test Session - ${batch} / ${tester}`);

for (const [label, value] of [
  ["Test date", today],
  ["Tester", tester],
  ["Device", device],
  ["OS version", osVersion],
  ["WeChat version", wechatVersion],
  ["Mini program AppID", appId],
  ["Experience build version", buildVersion],
  ["API domain", apiDomain],
  ["Git commit", gitCommit],
]) {
  session = replaceField(session, label, value);
}

session += `\n## Evidence Folder\n\nStore screenshots and recordings beside this file or in a sibling folder named \`${path.basename(outPath, ".md")}/\`.\n`;
session += "\nDo not paste AppSecret, database URLs, tokens, phone numbers, or private chat content into this file.\n";

const resolvedPath = path.resolve(projectRoot, outPath);
mkdirSync(path.dirname(resolvedPath), { recursive: true });
writeFileSync(resolvedPath, session, "utf8");

console.log(`Phone test session written to ${path.relative(projectRoot, resolvedPath)}`);
