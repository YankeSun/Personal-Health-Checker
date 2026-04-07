import { Prisma } from "@prisma/client";

import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { prisma } from "@/lib/db";
import { LoginInput, RegisterInput } from "@/lib/validations/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function registerUser(input: RegisterInput) {
  await ensureDatabaseSchema();
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        profile: {
          create: {
            displayName: input.displayName,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    return user;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AuthError("该邮箱已被注册", 409);
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput) {
  await ensureDatabaseSchema();
  const user = await prisma.user.findUnique({
    where: {
      email: input.email.toLowerCase(),
    },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new AuthError("邮箱或密码错误", 401);
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    throw new AuthError("邮箱或密码错误", 401);
  }

  return user;
}
