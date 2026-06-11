import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const miniprogramRoot = path.join(projectRoot, "miniprogram", "src");

describe("miniprogram structure", () => {
  it("defines the alpha shell pages required by the roadmap", () => {
    const appJson = JSON.parse(
      readFileSync(path.join(miniprogramRoot, "app.json"), "utf8"),
    ) as {
      pages: string[];
      tabBar: {
        list: Array<{
          pagePath: string;
        }>;
      };
    };
    const requiredPages = [
      "pages/login/login",
      "pages/today/today",
      "pages/dashboard/dashboard",
      "pages/trends/trends",
      "pages/me/me",
      "pages/legal/legal",
    ];

    expect(appJson.pages).toEqual(requiredPages);
    expect(appJson.tabBar.list.map((item) => item.pagePath)).toEqual([
      "pages/today/today",
      "pages/dashboard/dashboard",
      "pages/trends/trends",
      "pages/me/me",
    ]);

    for (const page of requiredPages) {
      for (const extension of ["js", "json", "wxml", "wxss"]) {
        expect(existsSync(path.join(miniprogramRoot, `${page}.${extension}`))).toBe(true);
      }
    }
  });

  it("exposes preflight checks for experience-build readiness", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(projectRoot, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
    };
    const checkScript = readFileSync(
      path.join(projectRoot, "scripts", "miniprogram-check.ts"),
      "utf8",
    );

    expect(packageJson.scripts["miniprogram:check"]).toBe(
      "tsx scripts/miniprogram-check.ts",
    );
    expect(packageJson.scripts["launch:check"]).toBe(
      "tsx scripts/launch-readiness-check.ts",
    );
    expect(packageJson.scripts["launch:check:strict"]).toBe(
      "tsx scripts/launch-readiness-check.ts --strict",
    );
    expect(packageJson.scripts["launch:check:vercel"]).toBe(
      "tsx scripts/launch-readiness-check.ts --strict --vercel",
    );
    expect(packageJson.scripts["miniprogram:check:strict"]).toBe(
      "tsx scripts/miniprogram-check.ts --strict",
    );
    expect(packageJson.scripts["miniprogram:check:remote"]).toBe(
      "tsx scripts/miniprogram-check.ts --remote",
    );
    expect(checkScript).toContain("WECHAT_MINI_PROGRAM_APP_ID");
    expect(checkScript).toContain("WECHAT_MINI_PROGRAM_APP_SECRET");
    expect(checkScript).toContain("apiBaseUrl uses HTTPS");
    expect(checkScript).toContain("/api/health");
  });

  it("documents environment readiness checks for mini program launch prep", () => {
    const readinessDoc = readFileSync(
      path.join(projectRoot, "miniprogram", "ENVIRONMENT_READINESS.md"),
      "utf8",
    );
    const readinessScript = readFileSync(
      path.join(projectRoot, "scripts", "launch-readiness-check.ts"),
      "utf8",
    );

    expect(readinessDoc).toContain("npm run launch:check:vercel");
    expect(readinessDoc).toContain("WECHAT_MINI_PROGRAM_APP_ID");
    expect(readinessDoc).toContain("WECHAT_MINI_PROGRAM_APP_SECRET");
    expect(readinessScript).toContain("DATABASE_URL");
    expect(readinessScript).toContain("SESSION_SECRET");
    expect(readinessScript).toContain("vercel");
  });

  it("calls the existing backend through bearer-token API helpers", () => {
    const apiHelper = readFileSync(
      path.join(miniprogramRoot, "utils", "api.js"),
      "utf8",
    );
    const loginPage = readFileSync(
      path.join(miniprogramRoot, "pages", "login", "login.js"),
      "utf8",
    );
    const todayPage = readFileSync(
      path.join(miniprogramRoot, "pages", "today", "today.js"),
      "utf8",
    );
    const mePage = readFileSync(
      path.join(miniprogramRoot, "pages", "me", "me.js"),
      "utf8",
    );
    const loginMarkup = readFileSync(
      path.join(miniprogramRoot, "pages", "login", "login.wxml"),
      "utf8",
    );
    const meMarkup = readFileSync(
      path.join(miniprogramRoot, "pages", "me", "me.wxml"),
      "utf8",
    );
    const legalPage = readFileSync(
      path.join(miniprogramRoot, "pages", "legal", "legal.js"),
      "utf8",
    );

    expect(apiHelper).toContain("Authorization: `Bearer ${token}`");
    expect(loginPage).toContain("/api/mp/auth/wechat-login");
    expect(loginPage).toContain("acceptedLegal");
    expect(loginPage).toContain("请先同意隐私保护指引和用户协议");
    expect(todayPage).toContain("/api/records/today");
    expect(todayPage).toContain("/api/records/${date}");
    expect(mePage).toContain("/api/intent/pay");
    expect(mePage).toContain("/api/account/export");
    expect(mePage).toContain("/api/account");
    expect(loginPage).toContain("/pages/legal/legal?type=${type}");
    expect(mePage).toContain("/pages/legal/legal?type=${type}");
    expect(loginMarkup).toContain("隐私保护指引");
    expect(loginMarkup).toContain("用户协议");
    expect(loginMarkup).toContain("健康免责声明");
    expect(meMarkup).toContain("协议与说明");
    expect(legalPage).toContain("privacy");
    expect(legalPage).toContain("terms");
    expect(legalPage).toContain("health");
  });
});
