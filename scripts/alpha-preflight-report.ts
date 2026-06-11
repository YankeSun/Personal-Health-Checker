import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type CommandResult = {
  status: number;
  output: string;
};

const projectRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const includeRemote = process.argv.includes("--remote");
const outPath = getArgValue("--out");

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function run(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });

  return {
    status: result.status ?? 1,
    output: [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
  };
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
    return "missing";
  }

  const config = readFileSync(configPath, "utf8");

  return config.match(/apiBaseUrl:\s*["']([^"']+)["']/)?.[1] ?? "missing";
}

function extractReadinessRows(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => line.match(/^\[(ok|warn|fail)\]\s+([^:]+):\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      status: match[1],
      label: match[2],
      summary: match[3],
    }));
}

function extractManualActions(output: string) {
  const actions: string[] = [];
  let collecting = false;

  for (const line of output.split(/\r?\n/)) {
    if (line.trim() === "Manual next actions:") {
      collecting = true;
      continue;
    }

    if (!collecting) {
      continue;
    }

    const match = line.match(/^\d+\.\s+(.+)$/);

    if (match) {
      actions.push(match[1]);
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    break;
  }

  return actions;
}

function markdownTable(rows: string[][]) {
  return rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}

const projectConfig = readJson<{ appid?: string }>(
  path.join(projectRoot, "miniprogram", "project.config.json"),
);
const vercelProject = readJson<{ projectName?: string }>(
  path.join(projectRoot, ".vercel", "project.json"),
);
const readinessArgs = includeRemote
  ? ["run", "alpha:readiness", "--", "--remote"]
  : ["run", "alpha:readiness"];
const readiness = run(npmCommand, readinessArgs);
const readinessRows = extractReadinessRows(readiness.output);
const manualActions = extractManualActions(readiness.output);
const statusLine =
  readiness.output.match(/Alpha readiness:\s*(.+)$/m)?.[1] ?? `exit=${readiness.status}`;
const gitStatus = gitValue(["status", "--short"]);
const gitClean = gitStatus.length === 0 ? "clean" : "dirty";
const generatedAt = new Date().toISOString();
const appId = projectConfig?.appid ?? "missing";
const appIdState = appId === "touristappid" ? "touristappid" : appId === "missing" ? "missing" : "configured";

const report = `# Alpha Preflight Report

Generated at: ${generatedAt}

## Snapshot

${markdownTable([
  ["Field", "Value"],
  ["---", "---"],
  ["Git branch", gitValue(["rev-parse", "--abbrev-ref", "HEAD"])],
  ["Git commit", gitValue(["rev-parse", "--short", "HEAD"])],
  ["Git working tree", gitClean],
  ["Vercel project", vercelProject?.projectName ?? "missing"],
  ["API domain", extractApiBaseUrl()],
  ["Mini program AppID state", appIdState],
  ["Remote API included", includeRemote ? "yes" : "no"],
])}

## Readiness Summary

Overall: ${statusLine}

${markdownTable([
  ["Check", "Status", "Summary"],
  ["---", "---", "---"],
  ...readinessRows.map((row) => [row.label, row.status, row.summary]),
])}

## Manual Next Actions

${manualActions.length > 0 ? manualActions.map((action, index) => `${index + 1}. ${action}`).join("\n") : "No manual actions reported."}

## Evidence Notes

- Paste this report into \`research/alpha/ALPHA_BATCH_CONTROL.md\` or save it beside phone-session evidence before uploading an Experience build.
- Do not paste secrets, tokens, database URLs, AppSecret values, or Vercel tokens into alpha evidence files.
- This report does not replace WeChat DevTools or real-device testing.
`;

if (outPath) {
  const resolvedPath = path.resolve(projectRoot, outPath);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, report, "utf8");
  console.log(`Alpha preflight report written to ${path.relative(projectRoot, resolvedPath)}`);
} else {
  console.log(report);
}
