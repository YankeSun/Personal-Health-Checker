import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const batch = getArgValue("--batch") ?? "Alpha-001";
const outPath =
  getArgValue("--out") ??
  `research/alpha/preflight/${safeSlug(batch)}-experience-gate.md`;

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

function runStep(label: string, args: string[]) {
  console.log(`\n[experience-gate] ${label}`);
  const result = spawnSync(npmCommand, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(
      `[experience-gate] Blocked at "${label}". Do not upload or share the Experience build.`,
    );
    process.exit(result.status ?? 1);
  }
}

runStep("Generate Day 0 preflight evidence", [
  "run",
  "alpha:preflight",
  "--",
  "--vercel",
  "--remote",
  "--out",
  outPath,
]);

runStep("Run strict alpha readiness", [
  "run",
  "alpha:readiness",
  "--",
  "--strict",
  "--vercel",
  "--remote",
]);

runStep("Run strict remote mini program check", [
  "run",
  "miniprogram:check:experience",
]);

console.log(
  "\n[experience-gate] GREEN. Automated gates passed; continue with WeChat DevTools upload and real-device evidence.",
);
