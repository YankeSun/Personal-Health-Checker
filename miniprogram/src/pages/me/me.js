const { clearAuth, ensureAuthed, request } = require("../../utils/api");

Page({
  data: {
    profile: {},
    goals: [],
    exporting: false,
    deleting: false,
    joiningReportBeta: false,
    message: "",
    error: "",
  },

  onShow() {
    if (!ensureAuthed()) {
      return;
    }

    this.loadSettings();
  },

  async loadSettings() {
    try {
      const [profilePayload, goalsPayload] = await Promise.all([
        request({
          url: "/api/profile",
        }),
        request({
          url: "/api/goals",
        }),
      ]);

      this.setData({
        profile: profilePayload.profile || {},
        goals: goalsPayload.goals || [],
        message: "",
        error: "",
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    }
  },

  async joinReportBeta() {
    this.setData({
      joiningReportBeta: true,
      message: "",
      error: "",
    });

    try {
      const payload = await request({
        url: "/api/intent/pay",
        method: "POST",
        data: {
          offer: "WEIGHT_REPORT_30D",
          source: "wechat_mp/me",
        },
      });

      this.setData({
        message: payload.message || "已记录你的内测意向。",
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    } finally {
      this.setData({
        joiningReportBeta: false,
      });
    }
  },

  async exportAccount() {
    this.setData({
      exporting: true,
      message: "",
      error: "",
    });

    try {
      const payload = await request({
        url: "/api/account/export",
      });
      const recordCount = Array.isArray(payload.dailyRecords)
        ? payload.dailyRecords.length
        : 0;

      this.setData({
        message: `已生成个人数据导出，共 ${recordCount} 条记录。`,
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    } finally {
      this.setData({
        exporting: false,
      });
    }
  },

  confirmDeleteAccount() {
    wx.showModal({
      title: "删除账号",
      content: "删除后会清空账号、目标、记录和微信身份映射，此操作不可恢复。",
      confirmText: "确认删除",
      confirmColor: "#be123c",
      success: (result) => {
        if (result.confirm) {
          this.deleteAccount();
        }
      },
    });
  },

  async deleteAccount() {
    this.setData({
      deleting: true,
      message: "",
      error: "",
    });

    try {
      await request({
        url: "/api/account",
        method: "DELETE",
      });
      clearAuth();
      wx.reLaunch({
        url: "/pages/login/login",
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    } finally {
      this.setData({
        deleting: false,
      });
    }
  },

  logout() {
    clearAuth();
    wx.reLaunch({
      url: "/pages/login/login",
    });
  },

  openLegal(event) {
    const type = event.currentTarget.dataset.type;

    wx.navigateTo({
      url: `/pages/legal/legal?type=${type}`,
    });
  },
});
