const { clearAuth, ensureAuthed, request, toErrorState } = require("../../utils/api");

const feedbackValueOptions = [
  { value: "KEEP_RECORDING", label: "更容易坚持记录" },
  { value: "UNDERSTAND_WEIGHT", label: "更能理解体重波动" },
  { value: "SEE_PROGRESS", label: "更清楚目标进度" },
  { value: "NOT_SURE", label: "暂时没感受到" },
];

const feedbackFrictionOptions = [
  { value: "TOO_MUCH_INPUT", label: "录入还是多" },
  { value: "UNCLEAR_VALUE", label: "价值不够清楚" },
  { value: "FORGET_TO_RECORD", label: "容易忘记" },
  { value: "NO_FRICTION", label: "目前顺手" },
];

const alphaTaskItems = [
  {
    key: "record",
    title: "记录今天体重",
    description: "完成一条体重记录，并尽量补充睡眠、饮水和背景标签。",
    actionLabel: "去记录",
    route: "/pages/today/today",
  },
  {
    key: "dashboard",
    title: "看今日概览",
    description: "确认系统有没有给出清楚的下一步和体重变化线索。",
    actionLabel: "看概览",
    route: "/pages/dashboard/dashboard",
  },
  {
    key: "trend",
    title: "回看体重趋势",
    description: "观察趋势结论、走势条和背景标签是否能帮助理解波动。",
    actionLabel: "看趋势",
    route: "/pages/trends/trends",
  },
  {
    key: "feedback",
    title: "提交 Alpha 反馈",
    description: "告诉我们你是否愿意连续使用 7 天，以及最卡的地方。",
    actionLabel: "去反馈",
    anchor: "feedback",
  },
];

const reportReasonItems = [
  "汇总 30 天体重变化和目标进度",
  "回看经常同天出现的饮食、活动和称重时段",
  "为下一版报告内测预留名额",
];

function decorateOptions(options, activeValue) {
  return options.map((option) => ({
    ...option,
    active: option.value === activeValue,
  }));
}

Page({
  data: {
    profile: {},
    goals: [],
    alphaTaskItems,
    reportReasonItems,
    feedback: {
      rating: 0,
      valueCue: "",
      friction: "",
      comment: "",
    },
    feedbackValueOptions: decorateOptions(feedbackValueOptions, ""),
    feedbackFrictionOptions: decorateOptions(feedbackFrictionOptions, ""),
    exporting: false,
    deleting: false,
    joiningReportBeta: false,
    submittingFeedback: false,
    message: "",
    error: "",
    errorDetail: "",
    errorRetryLabel: "",
    errorRetryAction: "",
  },

  onShow() {
    if (!ensureAuthed()) {
      return;
    }

    this.trackReportIntentShown();
    this.loadSettings();
  },

  async trackReportIntentShown() {
    if (this.reportIntentShownTracked) {
      return;
    }

    this.reportIntentShownTracked = true;

    try {
      await request({
        url: "/api/intent/pay",
        method: "POST",
        data: {
          action: "shown",
          offer: "WEIGHT_REPORT_30D",
          source: "wechat_mp/me",
        },
      });
    } catch {
      // Exposure tracking is diagnostic only and should not interrupt alpha tasks.
    }
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
        errorDetail: "",
        errorRetryLabel: "",
        errorRetryAction: "",
      });
    } catch (error) {
      const errorState = toErrorState(error, { retryLabel: "重新加载" });

      this.setData({
        ...errorState,
        errorRetryAction: errorState.errorRetryLabel ? "settings" : "",
      });
    }
  },

  async joinReportBeta() {
    this.setData({
      joiningReportBeta: true,
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
    });

    try {
      const payload = await request({
        url: "/api/intent/pay",
        method: "POST",
        data: {
          action: "clicked",
          offer: "WEIGHT_REPORT_30D",
          source: "wechat_mp/me",
        },
      });

      this.setData({
        message: payload.message || "已记录你的内测意向。",
      });
    } catch (error) {
      const errorState = toErrorState(error);

      this.setData({
        ...errorState,
        errorRetryAction: "",
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
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
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
      const errorState = toErrorState(error);

      this.setData({
        ...errorState,
        errorRetryAction: "",
      });
    } finally {
      this.setData({
        exporting: false,
      });
    }
  },

  setFeedbackRating(event) {
    this.setData({
      "feedback.rating": Number(event.currentTarget.dataset.rating),
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
    });
  },

  selectFeedbackValue(event) {
    const value = event.currentTarget.dataset.value;

    this.setData({
      "feedback.valueCue": value,
      feedbackValueOptions: decorateOptions(feedbackValueOptions, value),
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
    });
  },

  selectFeedbackFriction(event) {
    const value = event.currentTarget.dataset.value;

    this.setData({
      "feedback.friction": value,
      feedbackFrictionOptions: decorateOptions(feedbackFrictionOptions, value),
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
    });
  },

  handleFeedbackComment(event) {
    this.setData({
      "feedback.comment": event.detail.value,
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
    });
  },

  async submitFeedback() {
    const feedback = this.data.feedback;

    if (!feedback.rating || !feedback.valueCue || !feedback.friction) {
      this.setData({
        error: "请先选择评分、最有用的点和最卡的点",
        errorDetail: "",
        errorRetryLabel: "",
        errorRetryAction: "",
      });
      return;
    }

    this.setData({
      submittingFeedback: true,
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
    });

    try {
      const payload = await request({
        url: "/api/feedback",
        method: "POST",
        data: {
          source: "wechat_mp/me",
          rating: feedback.rating,
          valueCue: feedback.valueCue,
          friction: feedback.friction,
          comment: feedback.comment,
        },
      });

      this.setData({
        message: payload.message || "已收到反馈，谢谢。",
        feedback: {
          rating: 0,
          valueCue: "",
          friction: "",
          comment: "",
        },
        feedbackValueOptions: decorateOptions(feedbackValueOptions, ""),
        feedbackFrictionOptions: decorateOptions(feedbackFrictionOptions, ""),
      });
    } catch (error) {
      const errorState = toErrorState(error);

      this.setData({
        ...errorState,
        errorRetryAction: "",
      });
    } finally {
      this.setData({
        submittingFeedback: false,
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
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
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
      const errorState = toErrorState(error);

      this.setData({
        ...errorState,
        errorRetryAction: "",
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

  handleAlphaTask(event) {
    const route = event.currentTarget.dataset.route;
    const anchor = event.currentTarget.dataset.anchor;

    if (anchor === "feedback") {
      wx.pageScrollTo({
        selector: "#alpha-feedback",
        duration: 240,
      });
      return;
    }

    wx.switchTab({
      url: route || "/pages/today/today",
    });
  },

  openLegal(event) {
    const type = event.currentTarget.dataset.type;

    wx.navigateTo({
      url: `/pages/legal/legal?type=${type}`,
    });
  },

  retryLastAction() {
    if (this.data.errorRetryAction === "settings") {
      this.loadSettings();
    }
  },
});
