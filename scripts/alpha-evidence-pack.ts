import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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

const batchSlug = safeSlug(batch);
const preflightPath = `research/alpha/preflight/${batchSlug}.md`;
const phoneOnePath = `research/alpha/phone-sessions/${batchSlug}-${safeSlug(testerOne)}.md`;
const phoneTwoPath = `research/alpha/phone-sessions/${batchSlug}-${safeSlug(testerTwo)}.md`;
const sampleReportPath = `research/alpha/reports/${batchSlug}-sample-day10.md`;
const indexPath = `research/alpha/private/${batchSlug}-evidence-pack.md`;
const commands: PackCommand[] = [
  {
    label: "Generate alpha preflight report",
    args: [
      "run",
      "alpha:preflight",
      "--",
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
  {
    label: "Generate sample Day 10 markdown report",
    args: [
      "run",
      "analytics:miniprogram",
      "--",
      "--sample",
      "--format=markdown",
      "--out",
      sampleReportPath,
    ],
    outputPath: sampleReportPath,
  },
];

for (const command of commands) {
  runCommand(command);
}

const index = `# ${batch} Local Evidence Pack

Generated files:

${commands.map((command) => `- ${command.outputPath}`).join("\n")}

These files are local private evidence and are ignored by Git. Use them to run Day 0 / Day 1 checks, then paste only redacted summaries into \`research/alpha/ALPHA_BATCH_CONTROL.md\`.

Do not commit screenshots, recordings, phone numbers, identifiable user quotes, AppSecret values, tokens, or database URLs.
`;
const resolvedIndexPath = path.resolve(projectRoot, indexPath);
mkdirSync(path.dirname(resolvedIndexPath), { recursive: true });
writeFileSync(resolvedIndexPath, index, "utf8");

console.log(`[alpha-pack] Evidence pack index written to ${indexPath}`);
