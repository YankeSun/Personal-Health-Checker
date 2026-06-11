import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import {
  loginWechatMiniProgramUser,
  WechatAuthError,
} from "@/lib/services/wechat-auth-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    wechatIdentity: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn(),
}));

describe("wechat-auth-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WECHAT_MINI_PROGRAM_APP_ID = "wx_test_app";
    process.env.WECHAT_MINI_PROGRAM_APP_SECRET = "secret_test";
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(hashPassword).mockResolvedValue("hashed-random-password");
  });

  it("creates a user and WechatIdentity for a new openid", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        openid: "openid_1",
        unionid: "union_1",
        session_key: "should-not-be-persisted-or-returned",
      }),
    } as Response);
    vi.mocked(prisma.wechatIdentity.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user_1",
      email: "wechat-internal@wechat.local",
      profile: {
        displayName: "小程序用户",
      },
    });

    const result = await loginWechatMiniProgramUser({
      code: "login_code",
      displayName: "小程序用户",
    });

    expect(result).toMatchObject({
      isNewUser: true,
      user: {
        id: "user_1",
      },
    });
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      "https://api.weixin.qq.com/sns/jscode2session",
    );
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: expect.stringMatching(/^wechat-[a-f0-9]{24}@wechat\.local$/),
          passwordHash: "hashed-random-password",
          profile: {
            create: {
              displayName: "小程序用户",
            },
          },
          wechatIdentities: {
            create: {
              appId: "wx_test_app",
              openid: "openid_1",
              unionid: "union_1",
            },
          },
        }),
      }),
    );
  });

  it("returns an existing mapped user and refreshes unionid when needed", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        openid: "openid_1",
        unionid: "union_new",
      }),
    } as Response);
    vi.mocked(prisma.wechatIdentity.findUnique).mockResolvedValue({
      id: "wechat_identity_1",
      appId: "wx_test_app",
      openid: "openid_1",
      unionid: null,
      user: {
        id: "user_1",
        profile: {
          displayName: "微信用户",
        },
      },
    });

    const result = await loginWechatMiniProgramUser({
      code: "login_code",
    });

    expect(result.isNewUser).toBe(false);
    expect(result.user.id).toBe("user_1");
    expect(prisma.wechatIdentity.update).toHaveBeenCalledWith({
      where: {
        id: "wechat_identity_1",
      },
      data: {
        unionid: "union_new",
      },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("fails clearly when WeChat credentials are not configured", async () => {
    delete process.env.WECHAT_MINI_PROGRAM_APP_ID;

    await expect(
      loginWechatMiniProgramUser({
        code: "login_code",
      }),
    ).rejects.toMatchObject<WechatAuthError>({
      message: "微信登录暂未配置",
      status: 500,
    });
  });
});
