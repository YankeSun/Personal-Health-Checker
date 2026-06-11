const config = require("../../config");
const { request, saveAuth } = require("../../utils/api");

Page({
  data: {
    loading: false,
    mockLoading: false,
    error: "",
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
      });
      return;
    }

    this.setData({
      loading: true,
      error: "",
    });

    wx.login({
      success: async (result) => {
        if (!result.code) {
          this.setData({
            loading: false,
            error: "没有拿到微信登录 code，请重试",
          });
          return;
        }

        try {
          const payload = await request({
            url: "/api/mp/auth/wechat-login",
            method: "POST",
            data: {
              code: result.code,
            },
          });

          saveAuth(payload);
          wx.switchTab({
            url: "/pages/today/today",
          });
        } catch (error) {
          this.setData({
            error: error.message,
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
        });
      },
    });
  },

  async handleMockLogin() {
    if (!this.data.acceptedLegal) {
      this.setData({
        error: "请先同意隐私保护指引和用户协议",
      });
      return;
    }

    this.setData({
      mockLoading: true,
      error: "",
    });

    try {
      const payload = await request({
        url: "/api/mp/auth/wechat-login",
        method: "POST",
        data: {
          code: `mock:${Date.now()}`,
          displayName: "体验测试用户",
        },
      });

      saveAuth(payload);
      wx.switchTab({
        url: "/pages/today/today",
      });
    } catch (error) {
      this.setData({
        error: error.message,
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
    });
  },
});
