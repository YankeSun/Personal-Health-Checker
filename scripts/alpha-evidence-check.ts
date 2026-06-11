import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type CheckResult = {
  label: string;
  ok: boolean;
  detail: string;
};

type EvidenceSummary = {
  batch: string;
  checkedAt: string;
  realDeviceEvidence: boolean;
  userQuotes: boolean;
  competitorFieldwork: boolean;
  passed: boolean;
  checks: CheckResult[];
};

const projectRoot = process.cwd();
const batch = getArgValue("--batch") ?? "Alpha-001";
const json = process.argv.includes("--json");
const strict = process.argv.includes("--strict");
const batchSlug = safeSlug(batch);
const checks: CheckResult[] = [];

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

function addCheck(label: string, ok: boolean, detail: string) {
  checks.push({
    label,
    ok,
    detail,
  });
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

function sectionBetween(markdown: string, heading: string) {
  const start = markdown.indexOf(heading);

  if (start === -1) {
    return "";
  }

  const rest = markdown.slice(start + heading.length);
  const nextHeading = rest.search(/\n##\s+/);

  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function isFilled(value: string | undefined) {
  return Boolean(value && value.trim() && value.trim() !== "todo");
}

function listFiles(directory: string) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((filePath) => statSync(filePath).isFile());
}

function listDirectories(directory: string) {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((filePath) => statSync(filePath).isDirectory());
}

function countValidPhoneSessions() {
  const sessionDir = path.join(projectRoot, "research", "alpha", "phone-sessions");
  const requiredTasks = ["Login", "Today record", "Dashboard", "Trends", "Delete account guard"];
  const sessionFiles = listFiles(sessionDir).filter((filePath) =>
    path.basename(filePath).startsWith(batchSlug),
  );
  const validFiles = sessionFiles.filter((filePath) => {
    const text = readText(filePath);
    const appId = text.match(/^- Mini program AppID:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const apiDomain = text.match(/^- API domain:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const gitCommit = text.match(/^- Git commit:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const rows = parseMarkdownRows(text);
    const taskRows = rows.filter((row) => requiredTasks.includes(row[0]));
    const allRequiredTasksPassed = requiredTasks.every((task) => {
      const row = taskRows.find((item) => item[0] === task);
      const evidenceFile = row?.[4] ?? "";
      const passed = row?.[5]?.toLowerCase() ?? "";

      return passed === "yes" && isFilled(evidenceFile);
    });
    const hasP0Failure = rows.some((row) => {
      const passed = row[5]?.toLowerCase() ?? "";
      const severity = row[7]?.toUpperCase() ?? "";

      return passed === "no" && severity === "P0";
    });

    return (
      appId.length > 0 &&
      appId !== "touristappid" &&
      isFilled(apiDomain) &&
      isFilled(gitCommit) &&
      allRequiredTasksPassed &&
      !hasP0Failure
    );
  });

  addCheck(
    "2 real-device phone sessions passed",
    validFiles.length >= 2,
    `${validFiles.length}/${sessionFiles.length} valid sessions for ${batch}`,
  );

  return validFiles.length;
}

function countAlphaUserEvidence() {
  const evidencePath = path.join(projectRoot, "research", "alpha", "ALPHA_USER_EVIDENCE.md");
  const evidenceText = readText(evidencePath);
  const rows = parseMarkdownRows(sectionBetween(evidenceText, "## 1. User Table"));
  const userRows = rows.filter((row) => /^U\d+/i.test(row[0] ?? ""));
  const validUserRows = userRows.filter((row) => {
    const source = row[1];
    const motivation = row[2];
    const loginCompleted = row[5];
    const recordDays = row[7];
    const valueQuote = row[13];
    const frictionQuote = row[14];

    return (
      isFilled(source) &&
      isFilled(motivation) &&
      isFilled(loginCompleted) &&
      isFilled(recordDays) &&
      isFilled(valueQuote) &&
      isFilled(frictionQuote)
    );
  });
  const quoteRows = parseMarkdownRows(
    sectionBetween(evidenceText, "## 2. Interview Quotes"),
  ).filter(
    (row) =>
      row[0] !== "User" &&
      isFilled(row[0]) &&
      isFilled(row[1]) &&
      isFilled(row[2]),
  );

  addCheck(
    "10 alpha users have structured evidence",
    validUserRows.length >= 10,
    `${validUserRows.length}/${userRows.length} filled user rows`,
  );
  addCheck(
    "3 user quotes captured",
    quoteRows.length >= 3,
    `${quoteRows.length} quote rows`,
  );

  return {
    validUserRows: validUserRows.length,
    quoteRows: quoteRows.length,
  };
}

function checkCompetitorFieldwork() {
  const synthesisPath = path.join(projectRoot, "research", "WECHAT_COMPETITOR_SYNTHESIS.md");
  const synthesisText = readText(synthesisPath);
  const sampleRows = parseMarkdownRows(
    sectionBetween(synthesisText, "## 1. Sample Summary"),
  ).filter((row) => /^\d{2}$/.test(row[0] ?? ""));
  const completedRows = sampleRows.filter((row) => {
    const evidenceStatus = row[3]?.toLowerCase() ?? "";
    const scoreCells = row.slice(4, 10);

    return (
      !["", "todo", "needs_fieldwork"].includes(evidenceStatus) &&
      scoreCells.every((cell) => Number.isFinite(Number(cell))) &&
      isFilled(row[10]) &&
      isFilled(row[11])
    );
  });
  const evidenceDirs = listDirectories(path.join(projectRoot, "research", "evidence"));
  const completeEvidenceDirs = evidenceDirs.filter((directory) =>
    [
      "01-search.png",
      "02-first-open.mov",
      "03-first-record.mov",
      "04-retention-or-payment.png",
      "notes.md",
    ].every((fileName) => existsSync(path.join(directory, fileName))),
  );
  const fieldworkComplete = synthesisText.includes("当前状态：`fieldwork_complete`");

  addCheck(
    "competitor synthesis marked fieldwork_complete",
    fieldworkComplete,
    fieldworkComplete ? "fieldwork_complete" : "needs_fieldwork",
  );
  addCheck(
    "8 competitor sample rows completed",
    completedRows.length >= 8,
    `${completedRows.length}/${sampleRows.length} completed rows`,
  );
  addCheck(
    "8 competitor evidence folders complete",
    completeEvidenceDirs.length >= 8,
    `${completeEvidenceDirs.length}/${evidenceDirs.length} complete folders`,
  );

  return fieldworkComplete && completedRows.length >= 8 && completeEvidenceDirs.length >= 8;
}

const validPhoneSessions = countValidPhoneSessions();
const userEvidence = countAlphaUserEvidence();
const competitorFieldwork = checkCompetitorFieldwork();
const summary: EvidenceSummary = {
  batch,
  checkedAt: new Date().toISOString(),
  realDeviceEvidence: validPhoneSessions >= 2,
  userQuotes: userEvidence.quoteRows >= 3,
  competitorFieldwork,
  passed: false,
  checks,
};

summary.passed = checks.every((check) => check.ok);

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  for (const check of checks) {
    const icon = check.ok ? "ok" : "fail";
    console.log(`[${icon}] ${check.label}: ${check.detail}`);
  }

  console.log(
    `\nAlpha evidence check: ${summary.passed ? "passed" : "needs evidence"}.`,
  );
}

if (strict && !summary.passed) {
  process.exit(1);
}
