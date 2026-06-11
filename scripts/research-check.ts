import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type CheckResult = {
  label: string;
  ok: boolean;
};

const projectRoot = process.cwd();
const fieldworkPath = path.join(projectRoot, "research", "WECHAT_COMPETITOR_FIELDWORK.md");
const synthesisPath = path.join(projectRoot, "research", "WECHAT_COMPETITOR_SYNTHESIS.md");
const evidenceGuidePath = path.join(projectRoot, "research", "evidence", "README.md");
const sampleTemplatePath = path.join(projectRoot, "research", "templates", "wechat-competitor-sample.md");
const alphaBatchControlPath = path.join(projectRoot, "research", "alpha", "ALPHA_BATCH_CONTROL.md");
const alphaEvidencePath = path.join(projectRoot, "research", "alpha", "ALPHA_USER_EVIDENCE.md");
const phoneTestTemplatePath = path.join(projectRoot, "research", "alpha", "PHONE_TEST_SESSION_TEMPLATE.md");
const validationPlanPath = path.join(projectRoot, "WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md");
const progressLogPath = path.join(projectRoot, "PROGRESS_LOG.md");
const packageJsonPath = path.join(projectRoot, "package.json");
const gitignorePath = path.join(projectRoot, ".gitignore");
const results: CheckResult[] = [];

function check(label: string, ok: boolean) {
  results.push({ label, ok });
}

function readText(filePath: string) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

const fieldwork = readText(fieldworkPath);
const synthesis = readText(synthesisPath);
const evidenceGuide = readText(evidenceGuidePath);
const sampleTemplate = readText(sampleTemplatePath);
const alphaBatchControl = readText(alphaBatchControlPath);
const alphaEvidence = readText(alphaEvidencePath);
const phoneTestTemplate = readText(phoneTestTemplatePath);
const validationPlan = readText(validationPlanPath);
const progressLog = readText(progressLogPath);
const packageJson = readText(packageJsonPath);
const gitignore = readText(gitignorePath);
const sampleCount = Array.from(fieldwork.matchAll(/^### 样本 \d{2}：/gm)).length;

check("research/WECHAT_COMPETITOR_FIELDWORK.md exists", existsSync(fieldworkPath));
check("research/WECHAT_COMPETITOR_SYNTHESIS.md exists", existsSync(synthesisPath));
check("research/evidence/README.md exists", existsSync(evidenceGuidePath));
check("research/templates/wechat-competitor-sample.md exists", existsSync(sampleTemplatePath));
check("research/alpha/ALPHA_BATCH_CONTROL.md exists", existsSync(alphaBatchControlPath));
check("research/alpha/ALPHA_USER_EVIDENCE.md exists", existsSync(alphaEvidencePath));
check("research/alpha/PHONE_TEST_SESSION_TEMPLATE.md exists", existsSync(phoneTestTemplatePath));
check("fieldwork kit keeps 至少 8 个 sample slots", sampleCount >= 8);

for (const snippet of [
  "搜索截图",
  "首开录屏",
  "一次记录录屏",
  "付费 / 提醒 / 分享截图",
  "不要把它当作已经完成的竞品结论",
]) {
  check(`fieldwork kit requires evidence: ${snippet}`, fieldwork.includes(snippet));
}

for (const snippet of ["01-search.png", "02-first-open.mov", "03-first-record.mov", "04-retention-or-payment.png", "notes.md"]) {
  check(`evidence guide requires ${snippet}`, evidenceGuide.includes(snippet));
}

for (const snippet of ["Evidence status", "Time to first recordable action", "Record completion time", "Price anchor", "Health disclaimer"]) {
  check(`sample template includes ${snippet}`, sampleTemplate.includes(snippet));
}

for (const snippet of ["记录摩擦", "微信原生感", "回看价值", "留存机制", "商业化清晰度", "合规边界"]) {
  check(`fieldwork kit scores ${snippet}`, fieldwork.includes(snippet));
}

for (const snippet of ["必须学", "暂不学", "待验证"]) {
  check(`fieldwork kit includes synthesis bucket: ${snippet}`, fieldwork.includes(snippet));
}

for (const snippet of ["新健康指标", "订阅消息", "付费权益", "分享/社交", "设备同步"]) {
  check(`fieldwork kit has route gate for ${snippet}`, fieldwork.includes(snippet));
}

for (const snippet of ["needs_fieldwork", "Must Learn", "Do Not Learn Now", "Need To Validate", "fieldwork_complete"]) {
  check(`synthesis template includes ${snippet}`, synthesis.includes(snippet));
}

for (const snippet of ["needs_users", "First Weight Record Time", "Record Days In 7 Days", "Value Quote", "Friction Quote"]) {
  check(`alpha evidence template includes ${snippet}`, alphaEvidence.includes(snippet));
}

for (const snippet of [
  "needs_config",
  "Alpha-001",
  "Release Gates",
  "alpha:preflight",
  "alpha:phone-session",
  "Alpha-001-day10.md",
  "Real AppID configured",
  "2 real-device sessions passed",
  "npm run analytics:miniprogram -- --days=30",
  "beta_candidate",
]) {
  check(`alpha batch control includes ${snippet}`, alphaBatchControl.includes(snippet));
}

check(
  "package exposes alpha preflight report",
  packageJson.includes("\"alpha:preflight\""),
);
check(
  "package exposes alpha phone session generator",
  packageJson.includes("\"alpha:phone-session\""),
);
for (const snippet of [
  "research/evidence/**",
  "research/alpha/preflight/**",
  "research/alpha/phone-sessions/**",
  "research/alpha/reports/**",
  "research/alpha/private/**",
]) {
  check(`gitignore keeps private evidence local: ${snippet}`, gitignore.includes(snippet));
}

for (const snippet of ["Login", "Today record", "Dashboard", "Trends", "Delete account guard"]) {
  check(`phone test template covers ${snippet}`, phoneTestTemplate.includes(snippet));
}

check(
  "validation plan points to competitor fieldwork kit",
  validationPlan.includes("research/WECHAT_COMPETITOR_FIELDWORK.md"),
);
check(
  "progress log records competitor fieldwork kit",
  progressLog.includes("竞品实测采集包"),
);

let failed = 0;

for (const result of results) {
  if (result.ok) {
    console.log(`[ok] ${result.label}`);
  } else {
    failed += 1;
    console.error(`[error] ${result.label}`);
  }
}

if (failed > 0) {
  console.error(`\nResearch check failed: ${failed} issue(s).`);
  process.exit(1);
}

console.log("\nResearch check passed.");
