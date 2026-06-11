import { getMiniProgramAlphaSnapshot } from "@/lib/services/observability-service";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type AlphaSnapshot = Awaited<ReturnType<typeof getMiniProgramAlphaSnapshot>>;
type DecisionReview = {
  recommendation: "needs_data" | "hold_and_improve" | "beta_candidate";
  quantitativeGates: Array<{
    label: string;
    actual: string | number;
    target: string | number;
    passed: boolean;
  }>;
  evidenceChecklist: Array<{
    label: string;
    evidence: string;
    passed: boolean;
  }>;
  blockers: string[];
};

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

function buildDecisionReview(
  snapshot: AlphaSnapshot,
  evidence: {
    realDeviceEvidence: boolean;
    userQuotes: boolean;
    competitorFieldwork: boolean;
  },
): DecisionReview {
  const quantitativeGates = [
    {
      label: "Alpha 用户数",
      actual: snapshot.alphaUsers,
      target: 10,
      passed: snapshot.alphaUsers >= 10,
    },
    {
      label: "首次完整记录率",
      actual: `${snapshot.firstCompleteRecordRate}%`,
      target: ">= 60%",
      passed: snapshot.firstCompleteRecordRate >= 60,
    },
    {
      label: "次日回访率",
      actual: `${snapshot.nextDayReturnRate}%`,
      target: ">= 25%",
      passed: snapshot.nextDayReturnRate >= 25,
    },
    {
      label: "7 日内平均记录天数",
      actual: snapshot.averageRecordedDaysInFirst7Days,
      target: ">= 3",
      passed: snapshot.averageRecordedDaysInFirst7Days >= 3,
    },
    {
      label: "体重填写率",
      actual: `${snapshot.weightFillRate}%`,
      target: ">= 50%",
      passed: snapshot.weightFillRate >= 50,
    },
    {
      label: "上下文标签填写率",
      actual: `${snapshot.contextTagFillRate}%`,
      target: ">= 40%",
      passed: snapshot.contextTagFillRate >= 40,
    },
    {
      label: "付费意向点击率",
      actual: `${snapshot.payIntentRate}%`,
      target: ">= 5%",
      passed: snapshot.payIntentRate >= 5,
    },
    {
      label: "Alpha 反馈提交率",
      actual: `${snapshot.feedbackRate}%`,
      target: ">= 30%",
      passed: snapshot.feedbackRate >= 30,
    },
  ];
  const evidenceChecklist = [
    {
      label: "2 台真机验收证据",
      evidence: "research/alpha/phone-sessions/ local private notes",
      passed: evidence.realDeviceEvidence,
    },
    {
      label: "3-5 条用户原话",
      evidence: "research/alpha/ALPHA_USER_EVIDENCE.md redacted summary",
      passed: evidence.userQuotes,
    },
    {
      label: "微信竞品真机样本",
      evidence: "research/WECHAT_COMPETITOR_SYNTHESIS.md fieldwork_complete",
      passed: evidence.competitorFieldwork,
    },
  ];
  const blockers = [
    ...quantitativeGates
      .filter((gate) => !gate.passed)
      .map((gate) => `${gate.label} 未达标：当前 ${gate.actual}，目标 ${gate.target}`),
    ...evidenceChecklist
      .filter((item) => !item.passed)
      .map((item) => `${item.label} 缺失：${item.evidence}`),
  ];
  const hasMissingEvidence = evidenceChecklist.some((item) => !item.passed);
  const recommendation =
    snapshot.alphaUsers < 10 || hasMissingEvidence
      ? "needs_data"
      : quantitativeGates.every((gate) => gate.passed)
        ? "beta_candidate"
        : "hold_and_improve";

  return {
    recommendation,
    quantitativeGates,
    evidenceChecklist,
    blockers,
  };
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

function renderMarkdown(
  snapshot: AlphaSnapshot,
  review: DecisionReview,
  options: { sample?: boolean } = {},
) {
  return `# Mini Program Alpha Report

Generated at: ${snapshot.generatedAt}

Window: last ${snapshot.days} days

${options.sample ? "Sample: yes. This report is generated without database access and is not evidence for product decisions.\n" : ""}

## Decision

Metric decision: ${snapshot.decision}

Release recommendation: ${review.recommendation}

Do not treat \`continue_candidate\` or \`beta_candidate\` as permission to launch paid features. Combine this report with real-device evidence, user quotes, and WeChat fieldwork before planning beta.

## Decision Review

${markdownTable([
  ["Gate", "Actual", "Target", "Passed"],
  ["---", "---", "---", "---"],
  ...review.quantitativeGates.map((gate) => [
    gate.label,
    gate.actual,
    gate.target,
    gate.passed ? "yes" : "no",
  ]),
])}

## Evidence Checklist

${markdownTable([
  ["Evidence", "Source", "Ready"],
  ["---", "---", "---"],
  ...review.evidenceChecklist.map((item) => [
    item.label,
    item.evidence,
    item.passed ? "yes" : "no",
  ]),
])}

## Blockers

${review.blockers.length === 0 ? "- None." : review.blockers.map((blocker) => `- ${blocker}`).join("\n")}

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
  const evidence = {
    realDeviceEvidence: process.argv.includes("--real-device-evidence"),
    userQuotes: process.argv.includes("--user-quotes"),
    competitorFieldwork: process.argv.includes("--competitor-fieldwork"),
  };
  const normalizedDays = Number.isFinite(days) ? days : 30;
  const snapshot = sample
    ? createSampleSnapshot(normalizedDays)
    : await getMiniProgramAlphaSnapshot(normalizedDays);
  const decisionReview = buildDecisionReview(snapshot, evidence);
  const output =
    format === "markdown" || format === "md"
      ? renderMarkdown(snapshot, decisionReview, { sample })
      : JSON.stringify(
          sample
            ? { sample: true, ...snapshot, decisionReview }
            : { ...snapshot, decisionReview },
          null,
          2,
        );

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
