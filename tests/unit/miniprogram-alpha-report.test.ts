import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

describe("mini program alpha report", () => {
  it("keeps sample reports non-decisional even with manual evidence flags", () => {
    const result = spawnSync(
      npmCommand,
      [
        "run",
        "--silent",
        "analytics:miniprogram",
        "--",
        "--sample",
        "--real-device-evidence",
        "--user-quotes",
        "--competitor-fieldwork",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 8,
      },
    );

    expect(result.status).toBe(0);

    const report = JSON.parse(result.stdout) as {
      sample: boolean;
      decisionReview: {
        recommendation: string;
        blockers: string[];
      };
    };

    expect(report.sample).toBe(true);
    expect(report.decisionReview.recommendation).toBe("needs_data");
    expect(report.decisionReview.blockers).toContain(
      "Sample report is not decision evidence: generate a database-backed report after real alpha users complete the test window.",
    );
  });
});
