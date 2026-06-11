const config = require("./config");

App({
  globalData: {
    apiBaseUrl: config.apiBaseUrl,
    token: "",
    user: null,
  },

  onLaunch() {
    this.globalData.token = wx.getStorageSync("authToken") || "";
    this.globalData.user = wx.getStorageSync("authUser") || null;
  },
});
