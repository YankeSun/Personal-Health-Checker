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

function makeRequestError(message, detail, retryable) {
  const error = new Error(message);

  error.detail = detail;
  error.retryable = retryable;
  return error;
}

function toErrorState(error, options = {}) {
  const message = error && error.message
    ? error.message
    : options.fallbackMessage || "操作失败，请稍后重试";
  const detail = error && error.detail ? error.detail : "";
  const retryLabel = options.retryLabel && (!error || error.retryable !== false)
    ? options.retryLabel
    : "";

  return {
    error: message,
    errorDetail: detail,
    errorRetryLabel: retryLabel,
  };
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
    const requestUrl = `${app.globalData.apiBaseUrl}${options.url}`;

    wx.request({
      url: requestUrl,
      method: options.method || "GET",
      data: options.data,
      header,
      success(response) {
        if (response.statusCode === 401) {
          clearAuth();
          wx.reLaunch({
            url: "/pages/login/login",
          });
          reject(makeRequestError(
            "登录状态已失效，请重新登录",
            `接口 ${options.url} 返回 401，已清理本地登录态。`,
            false,
          ));
          return;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          const message = response.data && response.data.error
            ? response.data.error
            : "请求失败，请稍后再试";
          reject(makeRequestError(
            message,
            `接口 ${options.url} 返回 HTTP ${response.statusCode}。`,
            response.statusCode >= 500 || response.statusCode === 408 || response.statusCode === 429,
          ));
          return;
        }

        resolve(response.data);
      },
      fail(error) {
        const reason = error && error.errMsg ? `：${error.errMsg}` : "";

        reject(makeRequestError(
          "网络连接失败，请检查当前网络或小程序 request 合法域名配置",
          `未连通 ${requestUrl}${reason}`,
          true,
        ));
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
  toErrorState,
};
