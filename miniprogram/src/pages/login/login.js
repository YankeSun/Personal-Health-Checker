const config = require("../../config");
const { request, saveAuth, toErrorState } = require("../../utils/api");

const LEGAL_CONSENT_VERSION = "alpha-2026-06-12";

Page({
  data: {
    loading: false,
    mockLoading: false,
    error: "",
    errorDetail: "",
    acceptedLegal: false,
    mockLoginEnabled: Boolean(config.mockLoginEnabled),
  },

  onLoad() {
    if (wx.getStorageSync("authToken")) {
      wx.switchTab({
        url: "/pages/today/today",
      });
    }
  },

  handleWechatLogin() {
    if (!this.data.acceptedLegal) {
      this.setData({
        error: "请先同意隐私保护指引和用户协议",
        errorDetail: "",
      });
      return;
    }

    this.setData({
      loading: true,
      error: "",
      errorDetail: "",
    });

    wx.login({
      success: async (result) => {
        if (!result.code) {
          this.setData({
            loading: false,
            error: "没有拿到微信登录 code，请重试",
            errorDetail: "wx.login 未返回 code，通常是微信登录态、AppID 或开发者工具配置需要重新确认。",
          });
          return;
        }

        try {
          const payload = await request({
            url: "/api/mp/auth/wechat-login",
            method: "POST",
            data: {
              code: result.code,
              legalConsentAccepted: true,
              legalConsentVersion: LEGAL_CONSENT_VERSION,
              legalConsentAt: new Date().toISOString(),
            },
          });

          saveAuth(payload);
          wx.switchTab({
            url: "/pages/today/today",
          });
        } catch (error) {
          const errorState = toErrorState(error);

          this.setData({
            error: errorState.error,
            errorDetail: errorState.errorDetail,
          });
        } finally {
          this.setData({
            loading: false,
          });
        }
      },
      fail: () => {
        this.setData({
          loading: false,
          error: "微信登录失败，请稍后再试",
          errorDetail: "wx.login 调用失败，请先确认微信开发者工具、真机微信版本和小程序 AppID。",
        });
      },
    });
  },

  async handleMockLogin() {
    if (!this.data.acceptedLegal) {
      this.setData({
        error: "请先同意隐私保护指引和用户协议",
        errorDetail: "",
      });
      return;
    }

    this.setData({
      mockLoading: true,
      error: "",
      errorDetail: "",
    });

    try {
      const payload = await request({
        url: "/api/mp/auth/wechat-login",
        method: "POST",
        data: {
          code: `mock:${Date.now()}`,
          displayName: "体验测试用户",
          legalConsentAccepted: true,
          legalConsentVersion: LEGAL_CONSENT_VERSION,
          legalConsentAt: new Date().toISOString(),
        },
      });

      saveAuth(payload);
      wx.switchTab({
        url: "/pages/today/today",
      });
    } catch (error) {
      const errorState = toErrorState(error);

      this.setData({
        error: errorState.error,
        errorDetail: errorState.errorDetail,
      });
    } finally {
      this.setData({
        mockLoading: false,
      });
    }
  },

  openLegal(event) {
    const type = event.currentTarget.dataset.type;

    wx.navigateTo({
      url: `/pages/legal/legal?type=${type}`,
    });
  },

  toggleLegalAccepted() {
    this.setData({
      acceptedLegal: !this.data.acceptedLegal,
      error: "",
      errorDetail: "",
    });
  },
});
