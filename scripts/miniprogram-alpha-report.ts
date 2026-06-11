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

function createSampleSnapshot(days: number): AlphaSnapshot {
  return {
    days,
    generatedAt: new Date().toISOString(),
    alphaUsers: 10,
    newAlphaUsers: 8,
    usersWithAnyRecord: 8,
    usersWithCompleteRecord: 6,
    firstCompleteRecordRate: 60,
    nextDayReturnUsers: 3,
    nextDayReturnRate: 30,
    averageRecordedDaysInFirst7Days: 3.2,
    recordedDays: 32,
    weightFilledDays: 30,
    weightFillRate: 93.8,
    contextTagFilledDays: 16,
    contextTagFillRate: 50,
    dashboardViewUsers: 7,
    dashboardViewRate: 70,
    trendViewUsers: 5,
    trendViewRate: 50,
    payIntentUsers: 1,
    payIntentRate: 10,
    feedbackUsers: 4,
    feedbackRate: 40,
    averageFeedbackRating: 4.25,
    topValueCues: [
      {
        value: "UNDERSTAND_WEIGHT",
        count: 3,
      },
      {
        value: "EASIER_TO_RECORD",
        count: 2,
      },
    ],
    topFrictions: [
      {
        value: "FORGET_TO_RECORD",
        count: 2,
      },
      {
        value: "NEED_CLEARER_TREND",
        count: 1,
      },
    ],
    decision: "continue_candidate",
    gates: [
      {
        label: "次日回访率",
        actual: 30,
        target: 25,
        passed: true,
      },
      {
        label: "7 日内平均记录天数",
        actual: 3.2,
        target: 3,
        passed: true,
      },
      {
        label: "体重填写率",
        actual: 93.8,
        target: 50,
        passed: true,
      },
      {
        label: "上下文标签填写率",
        actual: 50,
        target: 40,
        passed: true,
      },
      {
        label: "付费意愿点击率",
        actual: 10,
        target: 5,
        passed: true,
      },
      {
        label: "反馈提交率",
        actual: 40,
        target: 30,
        passed: true,
      },
    ],
    notes: [
      "SAMPLE REPORT: this is generated without database access and must not be used for product decisions.",
      "Replace this report with a real database-backed report after the first alpha user batch.",
      "A continue_candidate sample only demonstrates formatting; it does not approve beta or paid features.",
    ],
  };
}

function renderMarkdown(snapshot: AlphaSnapshot, options: { sample?: boolean } = {}) {
  return `# Mini Program Alpha Report

Generated at: ${snapshot.generatedAt}

Window: last ${snapshot.days} days

${options.sample ? "Sample: yes. This report is generated without database access and is not evidence for product decisions.\n" : ""}

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
  const sample = process.argv.includes("--sample");
  const normalizedDays = Number.isFinite(days) ? days : 30;
  const snapshot = sample
    ? createSampleSnapshot(normalizedDays)
    : await getMiniProgramAlphaSnapshot(normalizedDays);
  const output =
    format === "markdown" || format === "md"
      ? renderMarkdown(snapshot, { sample })
      : JSON.stringify(sample ? { sample: true, ...snapshot } : snapshot, null, 2);

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
