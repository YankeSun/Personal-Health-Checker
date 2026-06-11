import { spawnSync } from "node:child_process";

type CheckStatus = "pass" | "warn" | "fail";

type ReadinessCheck = {
  label: string;
  command: string[];
  status: CheckStatus;
  summary: string;
  output: string;
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const strict = process.argv.includes("--strict");
const includeRemote = process.argv.includes("--remote");
const includeVercel = process.argv.includes("--vercel");

function runCommand(label: string, args: string[]): ReadinessCheck {
  const result = spawnSync(npmCommand, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  return {
    label,
    command: [npmCommand, ...args],
    status: result.status === 0 ? "pass" : "fail",
    summary: summarizeOutput(label, output, result.status ?? 1),
    output,
  };
}

function runGitWorkingTreeCheck(): ReadinessCheck {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.status !== 0) {
    return {
      label: "Git working tree",
      command: ["git", "status", "--short"],
      status: "fail",
      summary: output || `git status failed with exit=${result.status ?? "unknown"}`,
      output,
    };
  }

  const changedFiles = output.split(/\r?\n/).filter(Boolean);

  return {
    label: "Git working tree",
    command: ["git", "status", "--short"],
    status: changedFiles.length === 0 ? "pass" : "fail",
    summary: changedFiles.length === 0 ? "clean" : `${changedFiles.length} uncommitted change(s)`,
    output,
  };
}

function summarizeOutput(label: string, output: string, exitCode: number) {
  if (label === "Launch readiness") {
    const match = output.match(/Launch readiness:\s*(\d+) blocker\(s\),\s*(\d+) warning\(s\)/);

    if (match) {
      return `${match[1]} blocker(s), ${match[2]} warning(s)`;
    }
  }

  if (label === "Database connectivity") {
    const source = output.match(/\[db-doctor\]\s+(.+ source=.+)/)?.[1];
    const target = output.match(/\[db-doctor\]\s+(.+ target host=.+)/)?.[1];
    const failure = output.match(/\[db-doctor\]\s+failed:\s*(.+)/)?.[1];

    return [source, target, failure ? `failed=${failure}` : null]
      .filter(Boolean)
      .join("; ") || `exit=${exitCode}`;
  }

  const finalLine = output.split(/\n/).filter(Boolean).at(-1);

  return finalLine || `exit=${exitCode}`;
}

function classifyLaunchReadiness(check: ReadinessCheck): ReadinessCheck {
  if (check.label !== "Launch readiness") {
    return check;
  }

  const match = check.summary.match(/^(\d+) blocker\(s\),\s*(\d+) warning\(s\)$/);
  const blockerCount = Number(match?.[1] ?? 0);
  const warningCount = Number(match?.[2] ?? 0);

  if (blockerCount > 0) {
    return {
      ...check,
      status: "fail",
    };
  }

  if (warningCount > 0) {
    return {
      ...check,
      status: "warn",
    };
  }

  return check;
}

function printCheck(check: ReadinessCheck) {
  const icon = check.status === "pass" ? "ok" : check.status === "warn" ? "warn" : "fail";

  console.log(`[${icon}] ${check.label}: ${check.summary}`);
  console.log(`      ${check.command.join(" ")}`);
}

function gateLabel(status: CheckStatus) {
  if (status === "pass") return "READY";
  if (status === "warn") return "REVIEW";
  return "BLOCKED";
}

function buildExperienceGate(checksToReview: ReadinessCheck[]) {
  const failures = checksToReview.filter((check) => check.status === "fail");
  const warnings = checksToReview.filter((check) => check.status === "warn");
  const state = failures.length > 0 ? "RED" : warnings.length > 0 ? "YELLOW" : "GREEN";
  const guidance =
    state === "GREEN"
      ? "Automated gates are green. You can proceed to strict checks, remote checks, and real-device evidence before inviting users."
      : state === "YELLOW"
        ? "Do not invite external alpha users yet. Review the warning items and collect the missing manual evidence."
        : "Do not invite external alpha users. Resolve blocked items before uploading or sharing an Experience build.";

  return {
    state,
    guidance,
  };
}

function extractLaunchNextActions(output: string) {
  const actions: string[] = [];
  let collecting = false;

  for (const line of output.split(/\r?\n/)) {
    if (line.trim() === "Next actions:") {
      collecting = true;
      continue;
    }

    if (!collecting) {
      continue;
    }

    const match = line.match(/^\d+\.\s+\[(blocker|warning)\]\s+(.+)$/);

    if (match) {
      actions.push(match[2]);
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    break;
  }

  return actions;
}

function manualActionsFor(check: ReadinessCheck) {
  if (check.label === "Launch readiness") {
    return extractLaunchNextActions(check.output);
  }

  if (check.status === "fail" && check.label === "Database connectivity") {
    return [
      "Database connectivity: Check the current `DATABASE_URL` / Neon network reachability, then rerun `npm run db:doctor` before smoke testing.",
    ];
  }

  if (check.status === "fail" && check.label === "Remote mini program experience check") {
    return [
      "Remote mini program experience check: Verify the Vercel production domain, database, AppID/AppSecret, and request domain, then rerun `npm run miniprogram:check:experience`.",
    ];
  }

  if (check.status === "fail" && check.label === "Git working tree") {
    return [
      "Git working tree: Commit and push all intended changes, or stash unrelated local files, before generating Day 0 evidence or uploading an Experience build.",
    ];
  }

  return [];
}

const launchReadinessArgs = ["run", "launch:check"];

if (includeVercel) {
  launchReadinessArgs.push("--", "--vercel");
}

const checks = [
  runGitWorkingTreeCheck(),
  classifyLaunchReadiness(runCommand("Launch readiness", launchReadinessArgs)),
  runCommand("Mini program structure", ["run", "miniprogram:check"]),
  runCommand("Research evidence kit", ["run", "research:check"]),
  runCommand("Database connectivity", ["run", "db:doctor", "--", "--timeout-ms", "5000"]),
];

if (includeRemote) {
  checks.push(runCommand("Remote mini program experience check", ["run", "miniprogram:check:experience"]));
}

const experienceGate = buildExperienceGate(checks);

console.log(`Experience build gate: ${experienceGate.state}`);
console.log(`${experienceGate.guidance}\n`);

console.log("Gate checklist:");

for (const check of checks) {
  console.log(`- [${gateLabel(check.status)}] ${check.label}: ${check.summary}`);
}

console.log("\nAlpha readiness summary\n");

for (const check of checks) {
  printCheck(check);
}

const failures = checks.filter((check) => check.status === "fail");
const warnings = checks.filter((check) => check.status === "warn");

console.log(`\nAlpha readiness: ${failures.length} failed, ${warnings.length} warning(s).`);

if (warnings.length > 0) {
  console.log("Warnings usually mean external launch setup is still missing, such as real AppID/AppSecret.");
}

if (failures.length > 0) {
  console.log("Failures must be resolved before a reliable local or experience-build smoke test.");
}

const manualActions = checks.flatMap(manualActionsFor);

if (manualActions.length > 0) {
  console.log("\nManual next actions:");
  manualActions.forEach((action, index) => {
    console.log(`${index + 1}. ${action}`);
  });
}

if (strict && (failures.length > 0 || warnings.length > 0)) {
  process.exit(1);
}
