import { randomBytes, createHash } from "node:crypto";

import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { sendAuthEmail } from "@/lib/services/auth-email-service";
import { AuthError } from "@/lib/services/auth-service";

const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 2;

function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createOpaqueToken() {
  return randomBytes(32).toString("hex");
}

function getExpiryDate(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function buildUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}

export async function issueEmailVerification(userId: string, baseUrl: string) {
  await ensureDatabaseSchema();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AuthError("用户不存在", 404);
  }

  if (user.emailVerifiedAt) {
    return { alreadyVerified: true as const };
  }

  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = getExpiryDate(EMAIL_VERIFICATION_TTL_HOURS);
  const actionUrl = buildUrl(baseUrl, `/verify-email?token=${token}`);

  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  await sendAuthEmail({
    to: user.email,
    subject: "验证你的邮箱",
    html: `<p>点击下面的链接完成邮箱验证：</p><p><a href="${actionUrl}">${actionUrl}</a></p>`,
    text: `点击下面的链接完成邮箱验证：\n${actionUrl}`,
  });

  return { alreadyVerified: false as const };
}

export async function verifyEmailToken(token: string) {
  await ensureDatabaseSchema();

  const tokenHash = hashOpaqueToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.emailVerificationToken.delete({
        where: { id: record.id },
      });
    }

    throw new AuthError("验证链接无效或已过期", 400);
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: {
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.emailVerificationToken.deleteMany({
    where: { userId: record.userId },
  });
}

export async function requestPasswordReset(email: string, baseUrl: string) {
  await ensureDatabaseSchema();

  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return;
  }

  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = getExpiryDate(PASSWORD_RESET_TTL_HOURS);
  const actionUrl = buildUrl(baseUrl, `/reset-password?token=${token}`);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await sendAuthEmail({
    to: user.email,
    subject: "重置你的密码",
    html: `<p>点击下面的链接重置密码：</p><p><a href="${actionUrl}">${actionUrl}</a></p>`,
    text: `点击下面的链接重置密码：\n${actionUrl}`,
  });
}

export async function resetPasswordWithToken(token: string, nextPassword: string) {
  await ensureDatabaseSchema();

  const tokenHash = hashOpaqueToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.passwordResetToken.delete({
        where: { id: record.id },
      });
    }

    throw new AuthError("重置链接无效或已过期", 400);
  }

  const passwordHash = await hashPassword(nextPassword);

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.deleteMany({
    where: { userId: record.userId },
  });

  await prisma.session.deleteMany({
    where: { userId: record.userId },
  });
}
