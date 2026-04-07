import { prisma } from "@/lib/db";

let schemaReadyPromise: Promise<void> | null = null;

const schemaStatements = [
  `
  DO $$
  BEGIN
    CREATE TYPE "Metric" AS ENUM ('SLEEP', 'WEIGHT', 'WATER');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  `,
  `
  DO $$
  BEGIN
    CREATE TYPE "GoalMode" AS ENUM ('AT_LEAST', 'AT_MOST', 'IN_RANGE');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  `,
  `
  DO $$
  BEGIN
    CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LB');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  `,
  `
  DO $$
  BEGIN
    CREATE TYPE "WaterUnit" AS ENUM ('ML', 'OZ');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;
  `,
  `
  CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
  `,
  `
  CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "weightUnit" "WeightUnit" NOT NULL DEFAULT 'KG',
    "waterUnit" "WaterUnit" NOT NULL DEFAULT 'ML',
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId");
  `,
  `
  CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
  `,
  `
  CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
  `,
  `
  CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
  `,
  `
  CREATE TABLE IF NOT EXISTS "DailyRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sleepHours" DECIMAL(4, 2),
    "weightKg" DECIMAL(5, 2),
    "waterMl" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS "DailyRecord_userId_date_key" ON "DailyRecord"("userId", "date");
  `,
  `
  CREATE INDEX IF NOT EXISTS "DailyRecord_userId_date_idx" ON "DailyRecord"("userId", "date");
  `,
  `
  CREATE TABLE IF NOT EXISTS "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" "Metric" NOT NULL,
    "mode" "GoalMode" NOT NULL,
    "targetValue" DECIMAL(7, 2),
    "minValue" DECIMAL(7, 2),
    "maxValue" DECIMAL(7, 2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS "Goal_userId_metric_key" ON "Goal"("userId", "metric");
  `,
  `
  CREATE INDEX IF NOT EXISTS "Goal_userId_idx" ON "Goal"("userId");
  `,
] as const;

export async function ensureDatabaseSchema() {
  if (process.env.NODE_ENV === "test" || !process.env.DATABASE_URL) {
    return;
  }

  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      for (const statement of schemaStatements) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  await schemaReadyPromise;
}
