import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

describe("settings account data panel", () => {
  it("exposes account export and deletion controls from Web settings", () => {
    const settingsPage = readFileSync(
      path.join(projectRoot, "app", "(app)", "settings", "page.tsx"),
      "utf8",
    );
    const accountPanel = readFileSync(
      path.join(projectRoot, "components", "forms", "account-data-panel.tsx"),
      "utf8",
    );

    expect(settingsPage).toContain("AccountDataPanel");
    expect(accountPanel).toContain("/api/account/export");
    expect(accountPanel).toContain("/api/account");
    expect(accountPanel).toContain("导出个人数据");
    expect(accountPanel).toContain("删除账号");
    expect(accountPanel).toContain("DELETE");
    expect(accountPanel).toContain("personal-health-checker-account.json");
    expect(accountPanel).toContain("产品事件");
  });
});
