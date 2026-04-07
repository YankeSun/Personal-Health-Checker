import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return new PrismaClient({ log });
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
    log,
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
