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

    expect(apiHelper).toContain("Authorization: `Bearer ${token}`");
    expect(loginPage).toContain("/api/mp/auth/wechat-login");
    expect(todayPage).toContain("/api/records/today");
    expect(todayPage).toContain("/api/records/${date}");
  });
});
