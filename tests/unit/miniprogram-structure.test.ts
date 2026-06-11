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
    const databaseDoctorScript = readFileSync(
      path.join(projectRoot, "scripts", "database-doctor.ts"),
      "utf8",
    );
    const alphaReadinessScript = readFileSync(
      path.join(projectRoot, "scripts", "alpha-readiness-report.ts"),
      "utf8",
    );

    expect(packageJson.scripts["db:doctor"]).toBe(
      "tsx scripts/database-doctor.ts",
    );
    expect(packageJson.scripts["alpha:readiness"]).toBe(
      "tsx scripts/alpha-readiness-report.ts",
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
    expect(packageJson.scripts["miniprogram:smoke"]).toBe(
      "tsx scripts/miniprogram-alpha-smoke.ts",
    );
    expect(packageJson.scripts["miniprogram:smoke:local"]).toBe(
      "tsx scripts/miniprogram-alpha-local-smoke.ts",
    );
    expect(packageJson.scripts["analytics:miniprogram"]).toBe(
      "tsx scripts/miniprogram-alpha-report.ts",
    );
    expect(checkScript).toContain("WECHAT_MINI_PROGRAM_APP_ID");
    expect(checkScript).toContain("WECHAT_MINI_PROGRAM_APP_SECRET");
    expect(checkScript).toContain("apiBaseUrl uses HTTPS");
    expect(checkScript).toContain("/api/health");
    expect(checkScript).toContain("describeRemoteError");
    expect(checkScript).toContain("url=${healthUrl}");
    expect(checkScript).toContain("mockLoginEnabled");
    expect(databaseDoctorScript).toContain("resolveNextLikeEnvValue");
    expect(databaseDoctorScript).toContain("--database-url-env");
    expect(databaseDoctorScript).toContain("docker compose up -d postgres");
    expect(alphaReadinessScript).toContain("launch:check");
    expect(alphaReadinessScript).toContain("miniprogram:check");
    expect(alphaReadinessScript).toContain("research:check");
    expect(alphaReadinessScript).toContain("db:doctor");
    expect(alphaReadinessScript).toContain("Manual next actions");
    expect(alphaReadinessScript).toContain("extractLaunchNextActions");
  });

  it("documents environment readiness checks for mini program launch prep", () => {
    const readinessDoc = readFileSync(
      path.join(projectRoot, "miniprogram", "ENVIRONMENT_READINESS.md"),
      "utf8",
    );
    const releasePack = readFileSync(
      path.join(projectRoot, "miniprogram", "ALPHA_RELEASE_PACK.md"),
      "utf8",
    );
    const readinessScript = readFileSync(
      path.join(projectRoot, "scripts", "launch-readiness-check.ts"),
      "utf8",
    );
    const smokeScript = readFileSync(
      path.join(projectRoot, "scripts", "miniprogram-alpha-smoke.ts"),
      "utf8",
    );
    const localSmokeScript = readFileSync(
      path.join(projectRoot, "scripts", "miniprogram-alpha-local-smoke.ts"),
      "utf8",
    );

    expect(readinessDoc).toContain("npm run launch:check:vercel");
    expect(readinessDoc).toContain("npm run alpha:readiness");
    expect(readinessDoc).toContain("WECHAT_MINI_PROGRAM_APP_ID");
    expect(readinessDoc).toContain("WECHAT_MINI_PROGRAM_APP_SECRET");
    expect(readinessScript).toContain("DATABASE_URL");
    expect(readinessScript).toContain("SESSION_SECRET");
    expect(readinessScript).toContain("WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED");
    expect(readinessScript).toContain("nextActionFor");
    expect(readinessScript).toContain("Next actions");
    expect(readinessScript).toContain("vercel");
    expect(readinessScript).toContain("miniprogram/ALPHA_RELEASE_PACK.md");
    expect(readinessScript).toContain("research/alpha/ALPHA_BATCH_CONTROL.md");
    expect(readinessScript).toContain("research/WECHAT_COMPETITOR_FIELDWORK.md");
    expect(readinessScript).toContain("research/alpha/ALPHA_USER_EVIDENCE.md");
    expect(releasePack).toContain("7 天任务卡");
    expect(releasePack).toContain("npm run alpha:readiness");
    expect(releasePack).toContain("Manual next actions");
    expect(releasePack).toContain("可直接发送的邀请文案");
    expect(releasePack).toContain("npm run analytics:miniprogram");
    expect(smokeScript).toContain("/api/mp/auth/wechat-login");
    expect(smokeScript).toContain("/api/records/today");
    expect(smokeScript).toContain("/api/dashboard?days=7");
    expect(smokeScript).toContain("/api/trends?metric=weight&days=30");
    expect(smokeScript).toContain("/api/intent/pay");
    expect(smokeScript).toContain("/api/feedback");
    expect(localSmokeScript).toContain("WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED");
    expect(localSmokeScript).toContain('"run", "dev"');
    expect(localSmokeScript).toContain("--cleanup");
    expect(localSmokeScript).toContain("--database-url-env");
    expect(localSmokeScript).toContain("/api/health");
    expect(localSmokeScript).toContain("database=");
  });

  it("exposes mini program alpha reporting for commercial validation", () => {
    const reportScript = readFileSync(
      path.join(projectRoot, "scripts", "miniprogram-alpha-report.ts"),
      "utf8",
    );
    const validationPlan = readFileSync(
      path.join(projectRoot, "WECHAT_MINI_PROGRAM_VALIDATION_PLAN.md"),
      "utf8",
    );

    expect(reportScript).toContain("getMiniProgramAlphaSnapshot");
    expect(validationPlan).toContain("npm run analytics:miniprogram");
    expect(validationPlan).toContain("continue_candidate");
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
    const miniprogramConfig = readFileSync(
      path.join(miniprogramRoot, "config.js"),
      "utf8",
    );
    const todayPage = readFileSync(
      path.join(miniprogramRoot, "pages", "today", "today.js"),
      "utf8",
    );
    const todayMarkup = readFileSync(
      path.join(miniprogramRoot, "pages", "today", "today.wxml"),
      "utf8",
    );
    const mePage = readFileSync(
      path.join(miniprogramRoot, "pages", "me", "me.js"),
      "utf8",
    );
    const dashboardPage = readFileSync(
      path.join(miniprogramRoot, "pages", "dashboard", "dashboard.js"),
      "utf8",
    );
    const dashboardMarkup = readFileSync(
      path.join(miniprogramRoot, "pages", "dashboard", "dashboard.wxml"),
      "utf8",
    );
    const trendsPage = readFileSync(
      path.join(miniprogramRoot, "pages", "trends", "trends.js"),
      "utf8",
    );
    const trendsMarkup = readFileSync(
      path.join(miniprogramRoot, "pages", "trends", "trends.wxml"),
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
    expect(miniprogramConfig).toContain("mockLoginEnabled: false");
    expect(loginPage).toContain("/api/mp/auth/wechat-login");
    expect(loginPage).toContain("acceptedLegal");
    expect(loginPage).toContain("handleMockLogin");
    expect(loginPage).toContain("请先同意隐私保护指引和用户协议");
    expect(todayPage).toContain("/api/records/today");
    expect(todayPage).toContain("/api/records/${date}");
    expect(todayPage).toContain("qualityWarnings");
    expect(todayPage).toContain("completionSteps");
    expect(todayPage).toContain("goDashboard");
    expect(todayMarkup).toContain("今日称重");
    expect(todayMarkup).toContain("qualityWarnings");
    expect(todayMarkup).toContain("看今日概览");
    expect(dashboardPage).toContain("actionCards");
    expect(dashboardPage).toContain("weightContext");
    expect(dashboardPage).toContain("handleAction");
    expect(dashboardMarkup).toContain("今天先做什么");
    expect(dashboardMarkup).toContain("体重变化线索");
    expect(dashboardMarkup).toContain("今日三项");
    expect(trendsPage).toContain("buildInsight");
    expect(trendsPage).toContain("buildComparison");
    expect(trendsPage).toContain("buildSparkPoints");
    expect(trendsPage).toContain("buildTrendAction");
    expect(trendsMarkup).toContain("趋势结论");
    expect(trendsMarkup).toContain("最近走势");
    expect(trendsMarkup).toContain("体重背景");
    expect(trendsMarkup).toContain("最近记录");
    expect(mePage).toContain("/api/intent/pay");
    expect(mePage).toContain("/api/feedback");
    expect(mePage).toContain("submitFeedback");
    expect(mePage).toContain("alphaTaskItems");
    expect(mePage).toContain("reportReasonItems");
    expect(mePage).toContain("handleAlphaTask");
    expect(mePage).toContain("/api/account/export");
    expect(mePage).toContain("/api/account");
    expect(loginPage).toContain("/pages/legal/legal?type=${type}");
    expect(mePage).toContain("/pages/legal/legal?type=${type}");
    expect(loginMarkup).toContain("隐私保护指引");
    expect(loginMarkup).toContain("用户协议");
    expect(loginMarkup).toContain("健康免责声明");
    expect(meMarkup).toContain("协议与说明");
    expect(meMarkup).toContain("Alpha 反馈");
    expect(meMarkup).toContain("7 天测试任务");
    expect(meMarkup).toContain("30 天体重观察报告");
    expect(meMarkup).toContain("WAITLIST");
    expect(legalPage).toContain("privacy");
    expect(legalPage).toContain("terms");
    expect(legalPage).toContain("health");
  });
});
