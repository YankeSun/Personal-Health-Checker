const { clearAuth, ensureAuthed, request } = require("../../utils/api");

Page({
  data: {
    profile: {},
    goals: [],
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
        error: "",
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    }
  },

  logout() {
    clearAuth();
    wx.reLaunch({
      url: "/pages/login/login",
    });
  },
});
