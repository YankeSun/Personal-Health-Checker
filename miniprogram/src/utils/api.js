function getAppInstance() {
  return getApp();
}

function getToken() {
  return wx.getStorageSync("authToken") || "";
}

function saveAuth(payload) {
  const app = getAppInstance();

  wx.setStorageSync("authToken", payload.token);
  wx.setStorageSync("authUser", payload.user);
  wx.setStorageSync("authExpiresAt", payload.expiresAt);
  app.globalData.token = payload.token;
  app.globalData.user = payload.user;
}

function clearAuth() {
  const app = getAppInstance();

  wx.removeStorageSync("authToken");
  wx.removeStorageSync("authUser");
  wx.removeStorageSync("authExpiresAt");
  app.globalData.token = "";
  app.globalData.user = null;
}

function ensureAuthed() {
  if (!getToken()) {
    wx.reLaunch({
      url: "/pages/login/login",
    });
    return false;
  }

  return true;
}

function request(options) {
  const app = getAppInstance();
  const token = getToken();
  const header = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.header || {}),
  };

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data,
      header,
      success(response) {
        if (response.statusCode === 401) {
          clearAuth();
          wx.reLaunch({
            url: "/pages/login/login",
          });
          reject(new Error("登录状态已失效"));
          return;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          const message = response.data && response.data.error
            ? response.data.error
            : "请求失败，请稍后再试";
          reject(new Error(message));
          return;
        }

        resolve(response.data);
      },
      fail() {
        reject(new Error("网络连接失败"));
      },
    });
  });
}

module.exports = {
  clearAuth,
  ensureAuthed,
  getToken,
  request,
  saveAuth,
};
