import { getMiniProgramAlphaSnapshot } from "@/lib/services/observability-service";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type AlphaSnapshot = Awaited<ReturnType<typeof getMiniProgramAlphaSnapshot>>;

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function getInlineArgValue(name: string) {
  const prefix = `${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));

  return arg ? arg.slice(prefix.length) : null;
}

function markdownTable(rows: Array<Array<string | number>>) {
  return rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function formatTopItems(items: Array<{ value: string; count: number }>) {
  return items.length === 0
    ? "No feedback values recorded yet."
    : markdownTable([
        ["Value", "Count"],
        ["---", "---"],
        ...items.map((item) => [item.value, item.count]),
      ]);
}

function renderMarkdown(snapshot: AlphaSnapshot) {
  return `# Mini Program Alpha Report

Generated at: ${snapshot.generatedAt}

Window: last ${snapshot.days} days

## Decision

Decision: ${snapshot.decision}

Do not treat \`continue_candidate\` as permission to launch paid features. Combine this report with real-device evidence and user quotes before planning beta.

## Core Metrics

${markdownTable([
  ["Metric", "Value"],
  ["---", "---"],
  ["alphaUsers", snapshot.alphaUsers],
  ["newAlphaUsers", snapshot.newAlphaUsers],
  ["usersWithAnyRecord", snapshot.usersWithAnyRecord],
  ["usersWithCompleteRecord", snapshot.usersWithCompleteRecord],
  ["firstCompleteRecordRate", `${snapshot.firstCompleteRecordRate}%`],
  ["nextDayReturnRate", `${snapshot.nextDayReturnRate}%`],
  ["averageRecordedDaysInFirst7Days", snapshot.averageRecordedDaysInFirst7Days],
  ["weightFillRate", `${snapshot.weightFillRate}%`],
  ["contextTagFillRate", `${snapshot.contextTagFillRate}%`],
  ["dashboardViewRate", `${snapshot.dashboardViewRate}%`],
  ["trendViewRate", `${snapshot.trendViewRate}%`],
  ["payIntentRate", `${snapshot.payIntentRate}%`],
  ["feedbackRate", `${snapshot.feedbackRate}%`],
  ["averageFeedbackRating", snapshot.averageFeedbackRating],
])}

## Decision Gates

${markdownTable([
  ["Gate", "Actual", "Target", "Passed"],
  ["---", "---", "---", "---"],
  ...snapshot.gates.map((gate) => [
    gate.label,
    gate.actual,
    gate.target,
    gate.passed ? "yes" : "no",
  ]),
])}

## Feedback Signals

### Top Value Cues

${formatTopItems(snapshot.topValueCues)}

### Top Frictions

${formatTopItems(snapshot.topFrictions)}

## Notes

${snapshot.notes.map((note) => `- ${note}`).join("\n")}
`;
}

function describeReportError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const code = "code" in error ? String(error.code) : "";

  if (
    code === "ECONNREFUSED" ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("timeout")
  ) {
    return [
      "database unavailable while generating mini program alpha report",
      "Run `npm run db:doctor -- --timeout-ms 5000` to inspect the active DATABASE_URL.",
      "If `.env.local` has a backup connection variable, try `npm run db:doctor -- --database-url-env DATABASE_URL_UNPOOLED`.",
    ].join("\n");
  }

  return error.message;
}

async function main() {
  const daysArg = getInlineArgValue("--days") ?? getArgValue("--days");
  const days = daysArg ? Number(daysArg) : 30;
  const format = getInlineArgValue("--format") ?? getArgValue("--format") ?? "json";
  const outPath = getArgValue("--out");
  const snapshot = await getMiniProgramAlphaSnapshot(Number.isFinite(days) ? days : 30);
  const output =
    format === "markdown" || format === "md"
      ? renderMarkdown(snapshot)
      : JSON.stringify(snapshot, null, 2);

  if (outPath) {
    const resolvedPath = path.resolve(process.cwd(), outPath);
    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, output, "utf8");
    console.log(`mini program alpha report written to ${path.relative(process.cwd(), resolvedPath)}`);
    return;
  }

  console.log(output);
}

main().catch((error) => {
  console.error(`mini program alpha report failed: ${describeReportError(error)}`);

  if (process.argv.includes("--verbose")) {
    console.error(error);
  }

  process.exitCode = 1;
});
