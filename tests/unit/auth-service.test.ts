import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { loginUser, registerUser, AuthError } from "@/lib/services/auth-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("auth-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a user with a default profile", async () => {
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      passwordHash: "hashed",
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        id: "profile_1",
        userId: "user_1",
        displayName: "Demo",
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
        reminderEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const user = await registerUser({
      email: "demo@example.com",
      password: "password123",
      displayName: "Demo",
    });

    expect(user.profile?.displayName).toBe("Demo");
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "demo@example.com",
          profile: {
            create: {
              displayName: "Demo",
            },
          },
        }),
      }),
    );
  });

  it("throws a friendly error for duplicate email registration", async () => {
    vi.mocked(prisma.user.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(
      registerUser({
        email: "demo@example.com",
        password: "password123",
        displayName: "Demo",
      }),
    ).rejects.toMatchObject({
      message: "该邮箱已被注册",
      status: 409,
    });
  });

  it("logs in with a valid email and password", async () => {
    const passwordHash = await hashPassword("password123");

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        id: "profile_1",
        userId: "user_1",
        displayName: "Demo",
        timezone: "Asia/Shanghai",
        weightUnit: "KG",
        waterUnit: "ML",
        reminderEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const user = await loginUser({
      email: "demo@example.com",
      password: "password123",
    });

    expect(user.email).toBe("demo@example.com");
  });

  it("rejects invalid passwords", async () => {
    const passwordHash = await hashPassword("password123");

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      email: "demo@example.com",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: null,
    });

    await expect(
      loginUser({
        email: "demo@example.com",
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({
      message: "邮箱或密码错误",
      status: 401,
    });
  });
});
