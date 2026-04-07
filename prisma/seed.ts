import { GoalMode, Metric, PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { dateStringToStorageDate, getDateRange, getDateStringInTimezone } from "../lib/utils/dates";

const prisma = new PrismaClient();

const demoEmail = "demo@healthtracker.local";
const demoPassword = "DemoHealth123";

async function main() {
  const passwordHash = await hashPassword(demoPassword);
  const todayDate = getDateStringInTimezone("Asia/Shanghai");
  const dates = getDateRange(todayDate, 30);

  const user = await prisma.user.upsert({
    where: {
      email: demoEmail,
    },
    update: {
      passwordHash,
    },
    create: {
      email: demoEmail,
      passwordHash,
    },
  });

  await prisma.userProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {
      displayName: "健康演示用户",
      timezone: "Asia/Shanghai",
      weightUnit: "KG",
      waterUnit: "ML",
      reminderEnabled: true,
    },
    create: {
      userId: user.id,
      displayName: "健康演示用户",
      timezone: "Asia/Shanghai",
      weightUnit: "KG",
      waterUnit: "ML",
      reminderEnabled: true,
    },
  });

  await prisma.goal.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        metric: Metric.SLEEP,
        mode: GoalMode.AT_LEAST,
        targetValue: 7.5,
        minValue: null,
        maxValue: null,
        isActive: true,
      },
      {
        userId: user.id,
        metric: Metric.WEIGHT,
        mode: GoalMode.IN_RANGE,
        targetValue: null,
        minValue: 60,
        maxValue: 63,
        isActive: true,
      },
      {
        userId: user.id,
        metric: Metric.WATER,
        mode: GoalMode.AT_LEAST,
        targetValue: 2000,
        minValue: null,
        maxValue: null,
        isActive: true,
      },
    ],
  });

  await prisma.dailyRecord.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.dailyRecord.createMany({
    data: dates.map((date, index) => {
      const offset = dates.length - 1 - index;
      const isToday = date === todayDate;
      const sleepHours = offset % 6 === 0 ? 6.8 : 7.2 + ((index % 3) * 0.3);
      const weightKg = 62.6 - index * 0.04;
      const waterMl = offset % 5 === 0 ? 1600 : 1900 + (index % 4) * 150;

      return {
        userId: user.id,
        date: dateStringToStorageDate(date),
        sleepHours,
        weightKg,
        waterMl: isToday ? null : waterMl,
      };
    }),
  });

  console.log("Seed completed.");
  console.log(`Demo email: ${demoEmail}`);
  console.log(`Demo password: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
