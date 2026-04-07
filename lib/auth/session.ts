import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { cache } from "react";

import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from "@/lib/auth/constants";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getExpiryDate() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string) {
  await ensureDatabaseSchema();
  const token = randomBytes(32).toString("hex");
  const sessionToken = hashToken(token);
  const expiresAt = getExpiryDate();

  await prisma.session.create({
    data: {
      userId,
      sessionToken,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  await ensureDatabaseSchema();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        sessionToken: hashToken(token),
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  await ensureDatabaseSchema();

  const session = await prisma.session.findUnique({
    where: {
      sessionToken: hashToken(token),
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({
        where: {
          id: session.id,
        },
      });
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      lastAccessedAt: new Date(),
    },
  });

  return session;
});

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export function tokensMatch(rawToken: string, hashedToken: string) {
  const raw = Buffer.from(hashToken(rawToken));
  const hashed = Buffer.from(hashedToken);
  return raw.length === hashed.length && timingSafeEqual(raw, hashed);
}
