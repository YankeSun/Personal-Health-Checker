import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type PackCommand = {
  label: string;
  args: string[];
  outputPath: string;
};

const projectRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const batch = getArgValue("--batch") ?? "Alpha-001";
const includeRemote = process.argv.includes("--remote");
const includeVercel = process.argv.includes("--vercel");
const testerOne = getArgValue("--tester-one") ?? "internal-01";
const testerTwo = getArgValue("--tester-two") ?? "internal-02";

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "alpha";
}

function runCommand(command: PackCommand) {
  console.log(`[alpha-pack] ${command.label}`);
  const result = spawnSync(npmCommand, command.args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command.label} failed with exit=${result.status ?? "unknown"}`);
  }
}

function blockEvidencePack(message: string): never {
  console.error(`[alpha-pack] Blocked: ${message}`);
  process.exit(1);
}

function assertCleanWorkingTree() {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.status !== 0) {
    blockEvidencePack(output || `git status failed with exit=${result.status ?? "unknown"}`);
  }

  const changedFiles = output.split(/\r?\n/).filter(Boolean);

  if (changedFiles.length > 0) {
    blockEvidencePack(
      `Git working tree is dirty (${changedFiles.length} uncommitted change(s)). Commit and push intended changes before generating an alpha evidence pack.`,
    );
  }
}

assertCleanWorkingTree();

function extractPreflightGate(filePath: string) {
  const resolvedPath = path.resolve(projectRoot, filePath);
  const text = readFileSync(resolvedPath, "utf8");
  const state =
    text.match(/^Experience build gate:\s*(GREEN|YELLOW|RED)$/m)?.[1] ??
    text.match(/\|\s*Experience build gate\s*\|\s*(GREEN|YELLOW|RED)\s*\|/)?.[1] ??
    "unknown";
  const guidance =
    text.match(/^Gate guidance:\s*(.+)$/m)?.[1] ??
    "No gate guidance found in preflight report.";

  return {
    state,
    guidance,
  };
}

const batchSlug = safeSlug(batch);
const preflightPath = `research/alpha/preflight/${batchSlug}.md`;
const phoneOnePath = `research/alpha/phone-sessions/${batchSlug}-${safeSlug(testerOne)}.md`;
const phoneTwoPath = `research/alpha/phone-sessions/${batchSlug}-${safeSlug(testerTwo)}.md`;
const indexPath = `research/alpha/private/${batchSlug}-evidence-pack.md`;
const commands: PackCommand[] = [
  {
    label: "Generate alpha preflight report",
    args: [
      "run",
      "alpha:preflight",
      "--",
      ...(includeVercel ? ["--vercel"] : []),
      ...(includeRemote ? ["--remote"] : []),
      "--out",
      preflightPath,
    ],
    outputPath: preflightPath,
  },
  {
    label: `Generate phone session for ${testerOne}`,
    args: [
      "run",
      "alpha:phone-session",
      "--",
      "--batch",
      batch,
      "--tester",
      testerOne,
      "--device",
      "iPhone",
      "--wechat",
      "8.x",
      "--out",
      phoneOnePath,
    ],
    outputPath: phoneOnePath,
  },
  {
    label: `Generate phone session for ${testerTwo}`,
    args: [
      "run",
      "alpha:phone-session",
      "--",
      "--batch",
      batch,
      "--tester",
      testerTwo,
      "--device",
      "Android",
      "--wechat",
      "8.x",
      "--out",
      phoneTwoPath,
    ],
    outputPath: phoneTwoPath,
  },
];

for (const command of commands) {
  runCommand(command);
}

const preflightGate = extractPreflightGate(preflightPath);
const releaseGuidance =
  preflightGate.state === "GREEN"
    ? "GREEN means automated gates passed. Continue with WeChat DevTools upload and real-device evidence before inviting users."
    : "Do not upload or share the Experience build while this state is not GREEN. Resolve blockers, rerun the gate, then regenerate the evidence pack.";
const index = `# ${batch} Local Evidence Pack

## Experience Build Gate

- State: ${preflightGate.state}
- Guidance: ${preflightGate.guidance}
- Release note: ${releaseGuidance}

Generated files:

${commands.map((command) => `- ${command.outputPath}`).join("\n")}

These files are local private evidence and are ignored by Git. Use them to run Day 0 / Day 1 checks, then paste only redacted summaries into \`research/alpha/ALPHA_BATCH_CONTROL.md\`.

This pack intentionally does not generate a Day 10 analytics report. After real users complete the alpha window, run:

\`\`\`bash
npm run alpha:evidence-check -- --batch ${batch} --strict
npm run analytics:miniprogram -- --days=30 --format=markdown --evidence-check --batch ${batch} --out research/alpha/reports/${batchSlug}-day10.md
\`\`\`

Do not commit screenshots, recordings, phone numbers, identifiable user quotes, AppSecret values, tokens, or database URLs.
`;
const resolvedIndexPath = path.resolve(projectRoot, indexPath);
mkdirSync(path.dirname(resolvedIndexPath), { recursive: true });
writeFileSync(resolvedIndexPath, index, "utf8");

console.log(`[alpha-pack] Experience build gate: ${preflightGate.state}`);
console.log(`[alpha-pack] Evidence pack index written to ${indexPath}`);
