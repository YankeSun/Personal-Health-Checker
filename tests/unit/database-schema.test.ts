import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("database schema self-healing", () => {
  it("keeps production compatibility migrations for evolved auth fields", () => {
    const schemaSource = readFileSync(
      path.join(projectRoot, "lib/db/ensure-schema.ts"),
      "utf8",
    );

    expect(schemaSource).toContain(
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt"',
    );
    expect(schemaSource).toContain(
      'ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "timezone"',
    );
    expect(schemaSource).toContain(
      'ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "weightUnit"',
    );
    expect(schemaSource).toContain(
      'ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "waterUnit"',
    );
    expect(schemaSource).toContain(
      'ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "reminderEnabled"',
    );
    expect(schemaSource).toContain(
      'ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "lastAccessedAt"',
    );
  });
});
