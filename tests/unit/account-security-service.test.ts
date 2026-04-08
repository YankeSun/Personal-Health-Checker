import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { AuthError } from "@/lib/services/auth-service";
import { prisma } from "@/lib/db";
import {
  issueEmailVerification,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyEmailToken,
} from "@/lib/services/account-security-service";
import { sendAuthEmail } from "@/lib/services/auth-email-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/auth-email-service", () => ({
  sendAuthEmail: vi.fn(),
}));

describe("account-security-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues a verification token for an unverified user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      emailVerifiedAt: null,
    });

    const result = await issueEmailVerification("user_1", "http://localhost:3000");

    expect(result).toEqual({ alreadyVerified: false });
    expect(prisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledTimes(1);
    expect(sendAuthEmail).toHaveBeenCalledTimes(1);
  });

  it("does not issue a verification token for a verified user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      emailVerifiedAt: new Date(),
    });

    const result = await issueEmailVerification("user_1", "http://localhost:3000");

    expect(result).toEqual({ alreadyVerified: true });
    expect(prisma.emailVerificationToken.create).not.toHaveBeenCalled();
    expect(sendAuthEmail).not.toHaveBeenCalled();
  });

  it("verifies a valid email token", async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
      id: "verify_1",
      userId: "user_1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      user: {
        id: "user_1",
        email: "demo@example.com",
      },
    });

    await verifyEmailToken("token");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        emailVerifiedAt: expect.any(Date),
      },
    });
    expect(prisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
  });

  it("returns success for password reset requests even when the user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      requestPasswordReset("missing@example.com", "http://localhost:3000"),
    ).resolves.toBeUndefined();

    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendAuthEmail).not.toHaveBeenCalled();
  });

  it("resets password and clears existing sessions", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: "reset_1",
      userId: "user_1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      user: {
        id: "user_1",
        email: "demo@example.com",
      },
    });

    await resetPasswordWithToken("token", "Password123");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        passwordHash: expect.any(String),
      },
    });
    const passwordHash = vi.mocked(prisma.user.update).mock.calls[0]?.[0]?.data?.passwordHash;
    expect(await hashPassword("Password123")).not.toBe("Password123");
    expect(passwordHash).toBeTypeOf("string");
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
  });

  it("rejects expired reset tokens", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: "reset_1",
      userId: "user_1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      user: {
        id: "user_1",
        email: "demo@example.com",
      },
    });

    await expect(
      resetPasswordWithToken("token", "Password123"),
    ).rejects.toMatchObject<AuthError>({
      message: "重置链接无效或已过期",
      status: 400,
    });
  });
});
