import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type EnvSource = {
  name: string;
  values: Record<string, string>;
};

type ResolvedEnvValue = {
  key: string;
  value: string | null;
  source: string | null;
};

const projectRoot = process.cwd();
const envFileOrder = [
  ".env",
  ".env.development",
  ".env.local",
  ".env.development.local",
];

function parseEnvFile(filePath: string) {
  const values: Record<string, string> = {};

  if (!existsSync(filePath)) {
    return values;
  }

  for (const rawLine of readFileSync(filePath, "utf8").split(/\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    value = value.replace(/^['"]|['"]$/g, "");

    if (key) {
      values[key] = value;
    }
  }

  return values;
}

function getEnvSources(): EnvSource[] {
  return envFileOrder.map((fileName) => ({
    name: fileName,
    values: parseEnvFile(path.join(projectRoot, fileName)),
  }));
}

export function resolveNextLikeEnvValue(key: string): ResolvedEnvValue {
  if (process.env[key]) {
    return {
      key,
      value: process.env[key] ?? null,
      source: "process.env",
    };
  }

  for (const source of [...getEnvSources()].reverse()) {
    if (source.values[key]) {
      return {
        key,
        value: source.values[key],
        source: source.name,
      };
    }
  }

  return {
    key,
    value: null,
    source: null,
  };
}

export function getEnvFileValue(key: string) {
  for (const source of [...getEnvSources()].reverse()) {
    if (source.values[key]) {
      return {
        value: source.values[key],
        source: source.name,
      };
    }
  }

  return {
    value: null,
    source: null,
  };
}

export function describeDatabaseUrl(databaseUrl: string | null) {
  if (!databaseUrl) {
    return {
      host: "missing",
      database: "missing",
      isLocal: false,
      parseable: false,
    };
  }

  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname;

    return {
      host,
      database: parsed.pathname.replace(/^\//, "") || "missing",
      isLocal: ["localhost", "127.0.0.1", "::1"].includes(host),
      parseable: true,
    };
  } catch {
    return {
      host: "unparseable",
      database: "unparseable",
      isLocal: false,
      parseable: false,
    };
  }
}

