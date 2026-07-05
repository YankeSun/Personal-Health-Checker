import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
const originalDatabaseUrl = process.env.DATABASE_URL;

async function importEnvDiagnostics() {
  vi.resetModules();
  return import("../../scripts/env-diagnostics");
}

describe("env-diagnostics", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "health-env-"));
    process.chdir(tempDir);
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });

    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }

    vi.resetModules();
  });

  it("loads the same highest-priority DATABASE_URL that the doctor resolves", async () => {
    writeFileSync(
      path.join(tempDir, ".env"),
      "DATABASE_URL=postgres://base:base@localhost:5432/base\n",
      "utf8",
    );
    writeFileSync(
      path.join(tempDir, ".env.local"),
      "DATABASE_URL=postgres://local:local@db.example.test:5432/localdb\n",
      "utf8",
    );

    const { describeDatabaseUrl, loadNextLikeEnvValues, resolveNextLikeEnvValue } =
      await importEnvDiagnostics();
    const resolved = resolveNextLikeEnvValue("DATABASE_URL");
    const loaded = loadNextLikeEnvValues(["DATABASE_URL"]);
    const database = describeDatabaseUrl(process.env.DATABASE_URL ?? null);

    expect(resolved.source).toBe(".env.local");
    expect(loaded).toEqual([
      {
        key: "DATABASE_URL",
        loaded: true,
        source: ".env.local",
      },
    ]);
    expect(database).toMatchObject({
      host: "db.example.test",
      database: "localdb",
      parseable: true,
    });
  });

  it("does not override an explicit process DATABASE_URL", async () => {
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(
      path.join(tempDir, ".env.local"),
      "DATABASE_URL=postgres://local:local@db.example.test:5432/localdb\n",
      "utf8",
    );
    process.env.DATABASE_URL =
      "postgres://process:process@process.example.test:5432/processdb";

    const { describeDatabaseUrl, loadNextLikeEnvValues } = await importEnvDiagnostics();
    const loaded = loadNextLikeEnvValues(["DATABASE_URL"]);
    const database = describeDatabaseUrl(process.env.DATABASE_URL);

    expect(loaded).toEqual([
      {
        key: "DATABASE_URL",
        loaded: true,
        source: "process.env",
      },
    ]);
    expect(database).toMatchObject({
      host: "process.example.test",
      database: "processdb",
      parseable: true,
    });
  });
});
