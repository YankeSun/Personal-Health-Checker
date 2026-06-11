import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

const cookies = vi.fn();

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a bearer-ready session without writing a web cookie", async () => {
    const { createSession } = await import("@/lib/auth/session");

    const session = await createSession("user_1", { setCookie: false });

    expect(session.token).toHaveLength(64);
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        sessionToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: session.expiresAt,
      },
    });
    expect(cookies).not.toHaveBeenCalled();
  });

  it("resolves a user from an Authorization bearer token", async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: "session_1",
      userId: "user_1",
      sessionToken: "hashed-token",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      user: {
        id: "user_1",
        email: "wechat-user@wechat.local",
        profile: {
          displayName: "微信用户",
        },
      },
    });

    const { getCurrentUser } = await import("@/lib/auth/session");
    const user = await getCurrentUser(
      new Request("http://localhost:3000/api/dashboard", {
        headers: {
          Authorization: "Bearer raw-session-token",
        },
      }),
    );

    expect(user?.id).toBe("user_1");
    expect(prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      }),
    );
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: {
        id: "session_1",
      },
      data: {
        lastAccessedAt: expect.any(Date),
      },
    });
    expect(cookies).not.toHaveBeenCalled();
  });

  it("clears a bearer session without reading web cookies", async () => {
    const { clearSession } = await import("@/lib/auth/session");

    await clearSession(
      new Request("http://localhost:3000/api/account", {
        headers: {
          Authorization: "Bearer raw-session-token",
        },
      }),
    );

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        sessionToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
    expect(cookies).not.toHaveBeenCalled();
  });
});
