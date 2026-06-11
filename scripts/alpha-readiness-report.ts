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

function downgradeExpectedBlocker(check: ReadinessCheck): ReadinessCheck {
  if (check.label !== "Launch readiness") {
    return check;
  }

  const match = check.summary.match(/^(\d+) blocker\(s\),\s*(\d+) warning\(s\)$/);
  const blockerCount = Number(match?.[1] ?? 0);

  if (blockerCount > 0) {
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

  if (check.status === "fail" && check.label === "Remote mini program API") {
    return [
      "Remote mini program API: Verify the Vercel production domain resolves from this network and rerun `npm run miniprogram:check:remote`.",
    ];
  }

  return [];
}

const checks = [
  downgradeExpectedBlocker(runCommand("Launch readiness", ["run", "launch:check"])),
  runCommand("Mini program structure", ["run", "miniprogram:check"]),
  runCommand("Research evidence kit", ["run", "research:check"]),
  runCommand("Database connectivity", ["run", "db:doctor", "--", "--timeout-ms", "5000"]),
];

if (includeRemote) {
  checks.push(runCommand("Remote mini program API", ["run", "miniprogram:check:remote"]));
}

console.log("Alpha readiness summary\n");

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
