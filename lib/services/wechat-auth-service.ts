import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { hashPassword } from "@/lib/auth/password";
import { ensureDatabaseSchema } from "@/lib/db/ensure-schema";
import { prisma } from "@/lib/db";
import type { WechatLoginInput } from "@/lib/validations/mp-auth";

export class WechatAuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WechatAuthError";
    this.status = status;
  }
}

type WechatCodeSessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

type WechatSessionIdentity = {
  appId: string;
  openid: string;
  unionid: string | null;
};

const MOCK_WECHAT_APP_ID = "mock-wechat-mini-program";

export function isWechatMiniProgramMockLoginEnabled() {
  return (
    process.env.WECHAT_MINI_PROGRAM_MOCK_LOGIN_ENABLED === "true" &&
    process.env.VERCEL_ENV !== "production"
  );
}

function getWechatMiniProgramConfig() {
  const appId = process.env.WECHAT_MINI_PROGRAM_APP_ID;
  const appSecret = process.env.WECHAT_MINI_PROGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new WechatAuthError("微信登录暂未配置", 500);
  }

  return {
    appId,
    appSecret,
  };
}

function buildInternalWechatEmail(appId: string, openid: string) {
  const digest = createHash("sha256")
    .update(`${appId}:${openid}`)
    .digest("hex")
    .slice(0, 24);

  return `wechat-${digest}@wechat.local`;
}

async function exchangeWechatCode(code: string): Promise<WechatSessionIdentity> {
  if (code.startsWith("mock:")) {
    if (!isWechatMiniProgramMockLoginEnabled()) {
      throw new WechatAuthError("小程序测试登录未开启", 403);
    }

    return {
      appId: process.env.WECHAT_MINI_PROGRAM_APP_ID || MOCK_WECHAT_APP_ID,
      openid: `mock_${createHash("sha256")
        .update(code)
        .digest("hex")
        .slice(0, 24)}`,
      unionid: null,
    };
  }

  const { appId, appSecret } = getWechatMiniProgramConfig();
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");

  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const response = await fetch(url);

  if (!response.ok) {
    throw new WechatAuthError("微信登录服务暂时不可用", 502);
  }

  const data = (await response.json()) as WechatCodeSessionResponse;

  if (data.errcode) {
    throw new WechatAuthError(data.errmsg || "微信登录失败", 401);
  }

  if (!data.openid) {
    throw new WechatAuthError("微信登录结果缺少 openid", 502);
  }

  return {
    appId,
    openid: data.openid,
    unionid: data.unionid ?? null,
  };
}

async function findWechatIdentity(appId: string, openid: string) {
  return prisma.wechatIdentity.findUnique({
    where: {
      appId_openid: {
        appId,
        openid,
      },
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });
}

export async function loginWechatMiniProgramUser(input: WechatLoginInput) {
  await ensureDatabaseSchema();
  const identity = await exchangeWechatCode(input.code);
  const existingIdentity = await findWechatIdentity(identity.appId, identity.openid);

  if (existingIdentity) {
    if (identity.unionid && existingIdentity.unionid !== identity.unionid) {
      await prisma.wechatIdentity.update({
        where: {
          id: existingIdentity.id,
        },
        data: {
          unionid: identity.unionid,
        },
      });
    }

    return {
      user: existingIdentity.user,
      isNewUser: false,
    };
  }

  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

  try {
    const user = await prisma.user.create({
      data: {
        email: buildInternalWechatEmail(identity.appId, identity.openid),
        passwordHash,
        profile: {
          create: {
            displayName: input.displayName ?? "微信用户",
          },
        },
        wechatIdentities: {
          create: {
            appId: identity.appId,
            openid: identity.openid,
            unionid: identity.unionid,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    return {
      user,
      isNewUser: true,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const retriedIdentity = await findWechatIdentity(
        identity.appId,
        identity.openid,
      );

      if (retriedIdentity) {
        return {
          user: retriedIdentity.user,
          isNewUser: false,
        };
      }
    }

    throw error;
  }
}
