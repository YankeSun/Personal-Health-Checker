import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

describe("research materials", () => {
  it("exposes a check script for competitor fieldwork materials", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(projectRoot, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
    };
    const checkScript = readFileSync(
      path.join(projectRoot, "scripts", "research-check.ts"),
      "utf8",
    );

    expect(packageJson.scripts["research:check"]).toBe(
      "tsx scripts/research-check.ts",
    );
    expect(checkScript).toContain("WECHAT_COMPETITOR_FIELDWORK.md");
    expect(checkScript).toContain("WECHAT_COMPETITOR_SYNTHESIS.md");
    expect(checkScript).toContain("ALPHA_BATCH_CONTROL.md");
    expect(checkScript).toContain("ALPHA_USER_EVIDENCE.md");
    expect(checkScript).toContain("PHONE_TEST_SESSION_TEMPLATE.md");
    expect(checkScript).toContain("至少 8 个");
  });

  it("keeps the WeChat competitor fieldwork kit evidence-based", () => {
    const fieldwork = readFileSync(
      path.join(projectRoot, "research", "WECHAT_COMPETITOR_FIELDWORK.md"),
      "utf8",
    );
    const sampleCount = Array.from(fieldwork.matchAll(/^### 样本 \d{2}：/gm)).length;

    expect(sampleCount).toBeGreaterThanOrEqual(8);
    expect(fieldwork).toContain("不要把它当作已经完成的竞品结论");
    expect(fieldwork).toContain("搜索截图");
    expect(fieldwork).toContain("首开录屏");
    expect(fieldwork).toContain("一次记录录屏");
    expect(fieldwork).toContain("付费 / 提醒 / 分享截图");
    expect(fieldwork).toContain("必须学");
    expect(fieldwork).toContain("暂不学");
    expect(fieldwork).toContain("待验证");
  });

  it("provides copyable evidence templates for phone fieldwork", () => {
    const evidenceGuide = readFileSync(
      path.join(projectRoot, "research", "evidence", "README.md"),
      "utf8",
    );
    const sampleTemplate = readFileSync(
      path.join(projectRoot, "research", "templates", "wechat-competitor-sample.md"),
      "utf8",
    );
    const synthesis = readFileSync(
      path.join(projectRoot, "research", "WECHAT_COMPETITOR_SYNTHESIS.md"),
      "utf8",
    );
    const alphaEvidence = readFileSync(
      path.join(projectRoot, "research", "alpha", "ALPHA_USER_EVIDENCE.md"),
      "utf8",
    );
    const alphaBatchControl = readFileSync(
      path.join(projectRoot, "research", "alpha", "ALPHA_BATCH_CONTROL.md"),
      "utf8",
    );
    const phoneTestTemplate = readFileSync(
      path.join(projectRoot, "research", "alpha", "PHONE_TEST_SESSION_TEMPLATE.md"),
      "utf8",
    );

    expect(evidenceGuide).toContain("01-search.png");
    expect(evidenceGuide).toContain("03-first-record.mov");
    expect(sampleTemplate).toContain("Time to first recordable action");
    expect(sampleTemplate).toContain("Price anchor");
    expect(synthesis).toContain("needs_fieldwork");
    expect(synthesis).toContain("fieldwork_complete");
    expect(alphaEvidence).toContain("First Weight Record Time");
    expect(alphaEvidence).toContain("Value Quote");
    expect(alphaBatchControl).toContain("Release Gates");
    expect(alphaBatchControl).toContain("Alpha-001");
    expect(alphaBatchControl).toContain("2 real-device sessions passed");
    expect(alphaBatchControl).toContain("beta_candidate");
    expect(phoneTestTemplate).toContain("Today record");
    expect(phoneTestTemplate).toContain("Delete account guard");
  });

  it("links fieldwork to the mini program validation plan", () => {
    const validationPlan = readFileSync(
      path.join(projectRoot, "WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md"),
      "utf8",
    );

    expect(validationPlan).toContain("research/WECHAT_COMPETITOR_FIELDWORK.md");
  });
});
