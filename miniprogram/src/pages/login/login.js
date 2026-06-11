const { request, saveAuth } = require("../../utils/api");

Page({
  data: {
    loading: false,
    error: "",
  },

  onLoad() {
    if (wx.getStorageSync("authToken")) {
      wx.switchTab({
        url: "/pages/today/today",
      });
    }
  },

  handleWechatLogin() {
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

  openLegal(event) {
    const type = event.currentTarget.dataset.type;

    wx.navigateTo({
      url: `/pages/legal/legal?type=${type}`,
    });
  },
});
