import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";

const requireFromTest = createRequire(import.meta.url);
const projectRoot = process.cwd();

type MiniProgramGlobals = typeof globalThis & {
  Page: (config: Record<string, unknown>) => void;
  getApp: () => {
    globalData: Record<string, unknown>;
  };
  wx: Record<string, ReturnType<typeof vi.fn>>;
  __capturedPage?: Record<string, unknown>;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setByPath(target: Record<string, unknown>, pathExpression: string, value: unknown) {
  const parts = pathExpression.split(".");
  let current: Record<string, unknown> = target;

  for (const part of parts.slice(0, -1)) {
    const existing = current[part];

    if (!existing || typeof existing !== "object") {
      current[part] = {};
    }

    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

function installMiniProgramGlobals(responseByPath: Record<string, unknown> = {}) {
  const storage = new Map<string, unknown>([["authToken", "mini-token"]]);
  const globalRef = globalThis as MiniProgramGlobals;

  globalRef.__capturedPage = undefined;
  globalRef.getApp = () => ({
    globalData: {
      apiBaseUrl: "https://api.example.test",
      token: "mini-token",
      user: {
        id: "user_1",
      },
    },
  });
  globalRef.Page = (config) => {
    globalRef.__capturedPage = config;
  };
  globalRef.wx = {
    getStorageSync: vi.fn((key: string) => storage.get(key) ?? ""),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
    request: vi.fn((options: Record<string, unknown>) => {
      const url = String(options.url);
      const pathname = url.replace("https://api.example.test", "");
      const data = responseByPath[pathname] ?? {
        success: true,
        message: "ok",
      };
      const success = options.success as ((response: unknown) => void) | undefined;

      success?.({
        statusCode: 200,
        data,
      });
    }),
    reLaunch: vi.fn(),
    switchTab: vi.fn(),
    navigateTo: vi.fn(),
    pageScrollTo: vi.fn(),
    showModal: vi.fn(),
    setClipboardData: vi.fn((options: Record<string, unknown>) => {
      const success = options.success as (() => void) | undefined;

      success?.();
    }),
    login: vi.fn((options: Record<string, unknown>) => {
      const success = options.success as ((response: unknown) => void) | undefined;

      success?.({
        code: "wechat-code",
      });
    }),
  };
}

function loadPage(relativePath: string) {
  const pagePath = path.join(projectRoot, relativePath);
  const utilsPath = path.join(projectRoot, "miniprogram", "src", "utils", "api.js");

  delete requireFromTest.cache[requireFromTest.resolve(pagePath)];
  delete requireFromTest.cache[requireFromTest.resolve(utilsPath)];
  requireFromTest(pagePath);

  const pageConfig = (globalThis as MiniProgramGlobals).__capturedPage;

  if (!pageConfig) {
    throw new Error(`Page config was not captured for ${relativePath}`);
  }

  const instance = {
    ...pageConfig,
    data: clone(pageConfig.data),
    setData(patch: Record<string, unknown>) {
      for (const [key, value] of Object.entries(patch)) {
        setByPath(this.data as Record<string, unknown>, key, value);
      }
    },
  } as Record<string, unknown> & {
    data: Record<string, unknown>;
    setData: (patch: Record<string, unknown>) => void;
  };

  for (const [key, value] of Object.entries(pageConfig)) {
    if (typeof value === "function") {
      instance[key] = value.bind(instance);
    }
  }

  return instance;
}

describe("mini program page behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    const globalRef = globalThis as Partial<MiniProgramGlobals>;

    delete globalRef.Page;
    delete globalRef.getApp;
    delete globalRef.wx;
    delete globalRef.__capturedPage;
  });

  it("saves a complete Today record and keeps the dashboard CTA state", async () => {
    installMiniProgramGlobals({
      "/api/records/2026-06-12": {
        record: {
          date: "2026-06-12",
          sleepHours: 7.5,
          weightKg: 68.4,
          waterMl: 1800,
        },
        qualityWarnings: [{ id: "weight-outlier" }],
      },
    });
    const page = loadPage("miniprogram/src/pages/today/today.js") as {
      data: {
        record: Record<string, unknown>;
        form: Record<string, unknown>;
        completedCount: number;
        message: string;
        saving: boolean;
        qualityWarnings: Array<Record<string, unknown>>;
      };
      refreshDerivedState: () => void;
      saveRecord: () => Promise<void>;
    };

    page.setData({
      record: {
        date: "2026-06-12",
      },
      selectedDate: "2026-06-12",
      todayDate: "2026-06-12",
      form: {
        sleepHours: "7.5",
        weightKg: "68.4",
        waterMl: "1800",
        contextTags: {
          dietTags: ["NORMAL"],
          activityLevel: "NORMAL",
          energyLevel: "GOOD",
          weighTiming: "MORNING",
        },
      },
    });
    page.refreshDerivedState();
    await page.saveRecord();

    expect(page.data.completedCount).toBe(3);
    expect(page.data.message).toBe("今日记录已完成");
    expect(page.data.saving).toBe(false);
    expect(page.data.qualityWarnings).toEqual([{ id: "weight-outlier" }]);
    expect((globalThis as MiniProgramGlobals).wx.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.test/api/records/2026-06-12",
        method: "PUT",
        header: expect.objectContaining({
          Authorization: "Bearer mini-token",
        }),
      }),
    );
  });

  it("does not save an empty Today form", async () => {
    installMiniProgramGlobals();
    const page = loadPage("miniprogram/src/pages/today/today.js") as {
      data: {
        error: string;
      };
      saveRecord: () => Promise<void>;
    };

    page.setData({
      record: {
        date: "2026-06-12",
      },
    });
    await page.saveRecord();

    expect(page.data.error).toBe("至少先留下一项记录");
    expect((globalThis as MiniProgramGlobals).wx.request).not.toHaveBeenCalled();
  });

  it("shows actionable diagnostics when Today save hits a network failure", async () => {
    installMiniProgramGlobals();
    (globalThis as MiniProgramGlobals).wx.request.mockImplementationOnce((options) => {
      options.fail({
        errMsg: "request:fail url not in domain list",
      });
    });
    const page = loadPage("miniprogram/src/pages/today/today.js") as {
      data: {
        error: string;
        errorDetail: string;
        errorRetryLabel: string;
        errorRetryAction: string;
      };
      refreshDerivedState: () => void;
      saveRecord: () => Promise<void>;
    };

    page.setData({
      record: {
        date: "2026-06-12",
      },
      selectedDate: "2026-06-12",
      todayDate: "2026-06-12",
      form: {
        sleepHours: "",
        weightKg: "68.4",
        waterMl: "",
        contextTags: {
          dietTags: [],
          activityLevel: null,
          energyLevel: null,
          weighTiming: null,
        },
      },
    });
    page.refreshDerivedState();
    await page.saveRecord();

    expect(page.data.error).toContain("网络连接失败");
    expect(page.data.errorDetail).toContain("https://api.example.test/api/records/2026-06-12");
    expect(page.data.errorDetail).toContain("request:fail url not in domain list");
    expect(page.data.errorRetryLabel).toBe("重新保存");
    expect(page.data.errorRetryAction).toBe("save");
  });

  it("uses profile units on the mini program Today form while saving storage units", async () => {
    installMiniProgramGlobals({
      "/api/records/today": {
        record: {
          date: "2026-06-12",
          sleepHours: 7.5,
          weightKg: 63.5,
          waterMl: 2000,
          contextTags: {
            dietTags: [],
            activityLevel: null,
            energyLevel: null,
            weighTiming: null,
          },
        },
        profile: {
          weightUnit: "LB",
          waterUnit: "OZ",
        },
        qualityWarnings: [],
      },
      "/api/records/2026-06-12": {
        record: {
          date: "2026-06-12",
          sleepHours: 7.5,
          weightKg: 63.96,
          waterMl: 2070,
        },
        qualityWarnings: [],
      },
    });
    const page = loadPage("miniprogram/src/pages/today/today.js") as {
      data: {
        form: Record<string, unknown>;
        weightDisplay: string;
        weightUnitLabel: string;
        waterUnitLabel: string;
      };
      loadToday: () => Promise<void>;
      refreshDerivedState: () => void;
      saveRecord: () => Promise<void>;
    };

    await page.loadToday();

    expect(page.data.form.weightKg).toBe("140");
    expect(page.data.form.waterMl).toBe("68");
    expect(page.data.weightDisplay).toBe("140 lb");
    expect(page.data.weightUnitLabel).toBe("lb");
    expect(page.data.waterUnitLabel).toBe("oz");

    page.setData({
      "form.weightKg": "141",
      "form.waterMl": "70",
    });
    page.refreshDerivedState();
    await page.saveRecord();

    expect((globalThis as MiniProgramGlobals).wx.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.test/api/records/2026-06-12",
        method: "PUT",
        data: expect.objectContaining({
          weightKg: 63.96,
          waterMl: 2070,
        }),
      }),
    );
  });

  it("loads and saves a historical record from the Today date picker", async () => {
    installMiniProgramGlobals({
      "/api/records/today": {
        record: {
          date: "2026-06-12",
          sleepHours: null,
          weightKg: null,
          waterMl: null,
          contextTags: {
            dietTags: [],
            activityLevel: null,
            energyLevel: null,
            weighTiming: null,
          },
        },
        profile: {
          weightUnit: "KG",
          waterUnit: "ML",
        },
        qualityWarnings: [],
      },
      "/api/records/2026-06-10": {
        record: {
          date: "2026-06-10",
          sleepHours: null,
          weightKg: null,
          waterMl: null,
          isBackfilled: false,
          contextTags: {
            dietTags: [],
            activityLevel: null,
            energyLevel: null,
            weighTiming: null,
          },
        },
        qualityWarnings: [],
      },
    });
    const page = loadPage("miniprogram/src/pages/today/today.js") as {
      data: {
        selectedDate: string;
        todayDate: string;
        minRecordDate: string;
        maxRecordDate: string;
        dateDisplayLabel: string;
        dateActionLabel: string;
        recordFocusLabel: string;
        saveButtonLabel: string;
        form: Record<string, unknown>;
        message: string;
      };
      loadToday: () => Promise<void>;
      handleDateChange: (event: { detail: { value: string } }) => Promise<void>;
      refreshDerivedState: () => void;
      saveRecord: () => Promise<void>;
    };

    await page.loadToday();

    expect(page.data.todayDate).toBe("2026-06-12");
    expect(page.data.maxRecordDate).toBe("2026-06-12");
    expect(page.data.minRecordDate).toBe("2025-06-13");

    await page.handleDateChange({
      detail: {
        value: "2026-06-10",
      },
    });

    expect(page.data.selectedDate).toBe("2026-06-10");
    expect(page.data.dateDisplayLabel).toBe("6/10 补录");
    expect(page.data.dateActionLabel).toBe("换一天");
    expect(page.data.recordFocusLabel).toBe("补录体重");
    expect(page.data.saveButtonLabel).toBe("保存补录");

    page.setData({
      form: {
        sleepHours: "7",
        weightKg: "68.4",
        waterMl: "1800",
        contextTags: {
          dietTags: ["NORMAL"],
          activityLevel: "NORMAL",
          energyLevel: "GOOD",
          weighTiming: "MORNING",
        },
      },
    });
    page.refreshDerivedState();
    await page.saveRecord();

    expect(page.data.message).toBe("历史记录已补齐");
    expect((globalThis as MiniProgramGlobals).wx.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.test/api/records/2026-06-10",
        method: "PUT",
        data: expect.objectContaining({
          sleepHours: 7,
          weightKg: 68.4,
          waterMl: 1800,
        }),
      }),
    );
  });

  it("blocks mini program login until legal terms are accepted", () => {
    installMiniProgramGlobals();
    const page = loadPage("miniprogram/src/pages/login/login.js") as {
      data: {
        error: string;
        errorDetail: string;
      };
      handleWechatLogin: () => void;
    };

    page.handleWechatLogin();

    expect(page.data.error).toBe("请先同意隐私保护指引和用户协议");
    expect(page.data.errorDetail).toBe("");
    expect((globalThis as MiniProgramGlobals).wx.login).not.toHaveBeenCalled();
  });

  it("shows actionable diagnostics when wx.login fails", () => {
    installMiniProgramGlobals();
    (globalThis as MiniProgramGlobals).wx.login.mockImplementationOnce((options) => {
      options.fail({
        errMsg: "login:fail appid missing",
      });
    });
    const page = loadPage("miniprogram/src/pages/login/login.js") as {
      data: {
        acceptedLegal: boolean;
        loading: boolean;
        error: string;
        errorDetail: string;
      };
      handleWechatLogin: () => void;
    };

    page.setData({
      acceptedLegal: true,
    });
    page.handleWechatLogin();

    expect(page.data.loading).toBe(false);
    expect(page.data.error).toBe("微信登录失败，请稍后再试");
    expect(page.data.errorDetail).toContain("微信登录暂时不可用");
  });

  it("sends legal consent metadata when logging into the mini program", () => {
    installMiniProgramGlobals({
      "/api/mp/auth/wechat-login": {
        token: "mini-token",
        expiresAt: "2026-06-15T00:00:00.000Z",
        user: {
          id: "user_1",
        },
      },
    });
    const page = loadPage("miniprogram/src/pages/login/login.js") as {
      handleWechatLogin: () => void;
      setData: (patch: Record<string, unknown>) => void;
    };

    page.setData({
      acceptedLegal: true,
    });
    page.handleWechatLogin();

    expect((globalThis as MiniProgramGlobals).wx.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.test/api/mp/auth/wechat-login",
        method: "POST",
        data: expect.objectContaining({
          code: "wechat-code",
          legalConsentAccepted: true,
          legalConsentVersion: "product-2026-06-20",
          legalConsentAt: expect.any(String),
        }),
      }),
    );
  });

  it("routes Dashboard action cards to the most relevant mini program tab", async () => {
    installMiniProgramGlobals({
      "/api/dashboard?days=7": {
        dashboard: {
          todayCompletedMetrics: 3,
          totalTrackedMetrics: 3,
          insights: [
            {
              id: "review-trend",
              tone: "success",
              title: "看看体重变化",
              description: "今天已经记录完整，可以回看趋势。",
              actionHref: "/trends?metric=weight",
              actionLabel: "看趋势",
            },
          ],
          todayMetrics: [],
          window: {
            days: 7,
            metrics: [
              {
                metric: "SLEEP",
                label: "睡眠",
                attainmentRate: 71.4,
                recordedDays: 7,
              },
              {
                metric: "WEIGHT",
                label: "体重",
                attainmentRate: 42.9,
                recordedDays: 6,
              },
              {
                metric: "WATER",
                label: "饮水",
                attainmentRate: null,
                recordedDays: 5,
              },
            ],
          },
        },
        reminders: {
          reminders: [],
        },
      },
    });
    const page = loadPage("miniprogram/src/pages/dashboard/dashboard.js") as {
      data: {
        actionCards: Array<{
          route: string;
          isPrimary: boolean;
        }>;
        completionPercent: number;
        windowAttainmentRate: number;
      };
      loadDashboard: () => Promise<void>;
      handleAction: (event: { currentTarget: { dataset: { route: string } } }) => void;
    };

    await page.loadDashboard();

    expect(page.data.completionPercent).toBe(100);
    expect(page.data.windowAttainmentRate).toBe(57);
    expect(page.data.actionCards[0]).toEqual(
      expect.objectContaining({
        route: "/pages/trends/trends",
        isPrimary: true,
      }),
    );

    page.handleAction({
      currentTarget: {
        dataset: {
          route: page.data.actionCards[0].route,
        },
      },
    });

    expect((globalThis as MiniProgramGlobals).wx.switchTab).toHaveBeenCalledWith({
      url: "/pages/trends/trends",
    });
  });

  it("keeps Trends empty state focused on recording the first weight", async () => {
    installMiniProgramGlobals({
      "/api/trends?metric=weight&days=30": {
        trend: {
          days: 30,
          recordedDays: 0,
          points: [],
          unitLabel: "kg",
        },
      },
    });
    const page = loadPage("miniprogram/src/pages/trends/trends.js") as {
      data: {
        trendAction: {
          title: string;
          route: string;
        };
      };
      loadTrend: () => Promise<void>;
      handleTrendAction: (event: { currentTarget: { dataset: { route: string } } }) => void;
    };

    await page.loadTrend();

    expect(page.data.trendAction).toEqual(
      expect.objectContaining({
        title: "从今天开始",
        route: "/pages/today/today",
      }),
    );

    page.handleTrendAction({
      currentTarget: {
        dataset: {
          route: page.data.trendAction.route,
        },
      },
    });

    expect((globalThis as MiniProgramGlobals).wx.switchTab).toHaveBeenCalledWith({
      url: "/pages/today/today",
    });
  });

  it("keeps Trends low-density state focused on continuing records", async () => {
    installMiniProgramGlobals({
      "/api/trends?metric=weight&days=30": {
        trend: {
          days: 30,
          recordedDays: 4,
          points: [
            { date: "2026-06-09", label: "06/09", value: 68.2 },
            { date: "2026-06-10", label: "06/10", value: null },
            { date: "2026-06-11", label: "06/11", value: 68.1 },
            { date: "2026-06-12", label: "06/12", value: 67.9 },
          ],
          unitLabel: "kg",
        },
      },
    });
    const page = loadPage("miniprogram/src/pages/trends/trends.js") as {
      data: {
        trendAction: {
          title: string;
          description: string;
          route: string;
        };
      };
      loadTrend: () => Promise<void>;
    };

    await page.loadTrend();

    expect(page.data.trendAction).toEqual(
      expect.objectContaining({
        title: "点还不够密",
        description: "已记录 4/30 天。",
        route: "/pages/today/today",
      }),
    );
  });

  it("clears Me feedback form after a successful alpha feedback submission", async () => {
    installMiniProgramGlobals({
      "/api/feedback": {
        success: true,
        message: "已收到反馈，谢谢。",
      },
    });
    const page = loadPage("miniprogram/src/pages/me/me.js") as {
      data: {
        feedback: {
          rating: number;
          valueCue: string;
          friction: string;
          comment: string;
        };
        feedbackValueOptions: Array<{ active: boolean }>;
        feedbackFrictionOptions: Array<{ active: boolean }>;
        message: string;
        submittingFeedback: boolean;
      };
      submitFeedback: () => Promise<void>;
    };

    page.setData({
      feedback: {
        rating: 5,
        valueCue: "UNDERSTAND_WEIGHT",
        friction: "NO_FRICTION",
        comment: "愿意继续用",
      },
    });
    await page.submitFeedback();

    expect(page.data.message).toBe("已收到反馈，谢谢。");
    expect(page.data.submittingFeedback).toBe(false);
    expect(page.data.feedback).toEqual({
      rating: 0,
      valueCue: "",
      friction: "",
      comment: "",
    });
    expect(page.data.feedbackValueOptions.some((item) => item.active)).toBe(false);
    expect(page.data.feedbackFrictionOptions.some((item) => item.active)).toBe(false);
  });

  it("tracks Me report exposure once without interrupting settings", async () => {
    installMiniProgramGlobals({
      "/api/intent/pay": {
        success: true,
      },
    });
    const page = loadPage("miniprogram/src/pages/me/me.js") as {
      trackReportIntentShown: () => Promise<void>;
    };

    await page.trackReportIntentShown();
    await page.trackReportIntentShown();

    const exposureCalls = (globalThis as MiniProgramGlobals).wx.request.mock.calls.filter(
      ([options]) => options.url === "https://api.example.test/api/intent/pay",
    );

    expect(exposureCalls).toHaveLength(1);
    expect(exposureCalls[0][0]).toEqual(
      expect.objectContaining({
        method: "POST",
        data: {
          action: "shown",
          offer: "WEIGHT_REPORT_30D",
          source: "wechat_mp/me",
        },
      }),
    );
  });

  it("formats Me goals in plain language", async () => {
    installMiniProgramGlobals({
      "/api/profile": {
        profile: {
          displayName: "Alpha 用户",
          weightUnit: "KG",
          waterUnit: "ML",
        },
      },
      "/api/goals": {
        goals: [
          {
            metric: "SLEEP",
            mode: "AT_LEAST",
            isActive: true,
            targetValue: 7.5,
            minValue: null,
            maxValue: null,
          },
          {
            metric: "WEIGHT",
            mode: "IN_RANGE",
            isActive: true,
            targetValue: null,
            minValue: 60,
            maxValue: 63,
          },
          {
            metric: "WATER",
            mode: "AT_LEAST",
            isActive: false,
            targetValue: 1800,
            minValue: null,
            maxValue: null,
          },
        ],
      },
    });
    const page = loadPage("miniprogram/src/pages/me/me.js") as {
      data: {
        goals: Array<{
          metricLabel: string;
          summary: string;
        }>;
      };
      loadSettings: () => Promise<void>;
    };

    await page.loadSettings();

    expect(page.data.goals).toEqual([
      expect.objectContaining({
        metricLabel: "睡眠",
        summary: "至少 7.5 小时",
      }),
      expect.objectContaining({
        metricLabel: "体重",
        summary: "保持在 60 - 63 kg",
      }),
      expect.objectContaining({
        metricLabel: "饮水",
        summary: "暂未启用",
      }),
    ]);
  });

  it("copies a mini program account export summary to the clipboard", async () => {
    installMiniProgramGlobals({
      "/api/account/export": {
        exportedAt: "2026-06-14T03:00:00.000Z",
        user: {
          id: "user_1",
        },
        profile: {
          displayName: "Alpha 用户",
        },
        goals: [{ metric: "WEIGHT" }],
        dailyRecords: [{ date: "2026-06-14", weightKg: 68.4 }],
        productEvents: [{ eventName: "WECHAT_LOGIN_COMPLETED" }],
      },
    });
    const page = loadPage("miniprogram/src/pages/me/me.js") as {
      data: {
        message: string;
        exporting: boolean;
      };
      exportAccount: () => Promise<void>;
    };

    await page.exportAccount();

    expect((globalThis as MiniProgramGlobals).wx.setClipboardData).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.stringContaining('"dailyRecords": 1'),
      }),
    );
    expect(page.data.message).toBe("数据摘要已复制，共 1 条记录。");
    expect(page.data.exporting).toBe(false);
  });

  it("requires confirmation before deleting the account from Me", () => {
    installMiniProgramGlobals();
    const page = loadPage("miniprogram/src/pages/me/me.js") as {
      confirmDeleteAccount: () => void;
      deleteAccount: ReturnType<typeof vi.fn>;
    };

    page.deleteAccount = vi.fn();
    (globalThis as MiniProgramGlobals).wx.showModal.mockImplementationOnce((options) => {
      options.success({
        confirm: false,
      });
    });
    page.confirmDeleteAccount();
    expect(page.deleteAccount).not.toHaveBeenCalled();

    (globalThis as MiniProgramGlobals).wx.showModal.mockImplementationOnce((options) => {
      options.success({
        confirm: true,
      });
    });
    page.confirmDeleteAccount();
    expect(page.deleteAccount).toHaveBeenCalledTimes(1);
  });
});
