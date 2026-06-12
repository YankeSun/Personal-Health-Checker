import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const batch = getArgValue("--batch") ?? "Alpha-001";
const batchSlug = safeSlug(batch);
const requiredTasks = [
  "Login",
  "Today record",
  "Dashboard",
  "Trends",
  "Me",
  "Pay intent",
  "Feedback",
  "Export",
  "Delete account guard",
];

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function safeSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "alpha"
  );
}

function readText(filePath: string) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function listFiles(directory: string) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((filePath) => statSync(filePath).isFile());
}

function parseMarkdownRows(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|") && line.trim().endsWith("|"))
    .filter((line) => !/^\|\s*-+/.test(line.trim()))
    .map((line) =>
      line
        .trim()
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

function isFilled(value: string | undefined) {
  return Boolean(value && value.trim() && value.trim() !== "todo");
}

function getInfoField(text: string, label: string) {
  return text.match(new RegExp(`^- ${label}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
}

function validatePhoneSession(filePath: string) {
  const text = readText(filePath);
  const appId = getInfoField(text, "Mini program AppID");
  const apiDomain = getInfoField(text, "API domain");
  const gitCommit = getInfoField(text, "Git commit");
  const buildVersion = getInfoField(text, "Experience build version");
  const rows = parseMarkdownRows(text);
  const missingTasks: string[] = [];
  const failedP0Tasks: string[] = [];

  for (const task of requiredTasks) {
    const row = rows.find((item) => item[0] === task);
    const evidenceFile = row?.[4] ?? "";
    const passed = row?.[5]?.toLowerCase() ?? "";
    const severity = row?.[7]?.toUpperCase() ?? "";

    if (passed === "no" && severity === "P0") {
      failedP0Tasks.push(task);
    }

    if (passed !== "yes" || !isFilled(evidenceFile)) {
      missingTasks.push(task);
    }
  }

  const issues = [
    appId.length === 0 || appId === "touristappid" ? "missing real AppID" : null,
    !isFilled(apiDomain) ? "missing API domain" : null,
    !isFilled(gitCommit) ? "missing Git commit" : null,
    !isFilled(buildVersion) ? "missing Experience build version" : null,
    missingTasks.length > 0 ? `missing passed evidence for: ${missingTasks.join(", ")}` : null,
    failedP0Tasks.length > 0 ? `P0 failed tasks: ${failedP0Tasks.join(", ")}` : null,
  ].filter(Boolean) as string[];

  return {
    filePath,
    ok: issues.length === 0,
    issues,
  };
}

function runExperienceGate() {
  console.log("[invite-gate] Step 1/2: experience build gate");
  const result = spawnSync(npmCommand, [
    "run",
    "alpha:gate:experience",
    "--",
    "--batch",
    batch,
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error("[invite-gate] Blocked. Do not invite external users.");
    process.exit(result.status ?? 1);
  }
}

function runPhoneSessionGate() {
  console.log("\n[invite-gate] Step 2/2: real-device phone sessions");
  const sessionDir = path.join(projectRoot, "research", "alpha", "phone-sessions");
  const sessionFiles = listFiles(sessionDir).filter((filePath) =>
    path.basename(filePath).toLowerCase().startsWith(batchSlug),
  );
  const results = sessionFiles.map(validatePhoneSession);
  const validResults = results.filter((result) => result.ok);

  for (const result of results) {
    const relativePath = path.relative(projectRoot, result.filePath);

    if (result.ok) {
      console.log(`[ok] ${relativePath}`);
      continue;
    }

    console.log(`[blocked] ${relativePath}: ${result.issues.join("; ")}`);
  }

  if (validResults.length < 2) {
    console.error(
      `[invite-gate] Blocked. Need at least 2 valid real-device phone sessions for ${batch}; found ${validResults.length}/${sessionFiles.length}.`,
    );
    process.exit(1);
  }
}

runExperienceGate();
runPhoneSessionGate();

console.log(
  `\n[invite-gate] GREEN. ${batch} can invite the first external alpha users. Continue Day 2-10 evidence collection separately.`,
);
