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
    title: "记录今天",
    description: "先留下体重，再补睡眠、饮水和体重线索。",
    actionLabel: "去记录",
    route: "/pages/today/today",
  },
  {
    key: "dashboard",
    title: "看今日概览",
    description: "看看今天的进度、连续状态和体重线索。",
    actionLabel: "看概览",
    route: "/pages/dashboard/dashboard",
  },
  {
    key: "trend",
    title: "回看体重趋势",
    description: "看最近 30 天的体重线和日常线索。",
    actionLabel: "看趋势",
    route: "/pages/trends/trends",
  },
  {
    key: "feedback",
    title: "留下反馈",
    description: "告诉我们哪一步最顺，哪一步最卡。",
    actionLabel: "去反馈",
    anchor: "feedback",
  },
];

const reportReasonItems = [
  "汇总 30 天体重变化和目标进度",
  "回看饮食、活动和称重时段线索",
  "开放后优先体验",
];

const metricLabels = {
  SLEEP: "睡眠",
  WEIGHT: "体重",
  WATER: "饮水",
};

const unitLabels = {
  SLEEP: "小时",
  WEIGHT: "kg",
  WATER: "ml",
};

function decorateOptions(options, activeValue) {
  return options.map((option) => ({
    ...option,
    active: option.value === activeValue,
  }));
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(1).replace(/\.0$/, "");
}

function formatGoalSummary(goal) {
  const label = metricLabels[goal.metric] || "目标";
  const unit = unitLabels[goal.metric] || "";

  if (!goal.isActive) {
    return {
      ...goal,
      metricLabel: label,
      summary: "暂未启用",
    };
  }

  if (goal.mode === "IN_RANGE") {
    const minValue = formatNumber(goal.minValue);
    const maxValue = formatNumber(goal.maxValue);

    return {
      ...goal,
      metricLabel: label,
      summary: minValue && maxValue
        ? `保持在 ${minValue} - ${maxValue} ${unit}`
        : "目标区间待完善",
    };
  }

  const targetValue = formatNumber(goal.targetValue);

  if (!targetValue) {
    return {
      ...goal,
      metricLabel: label,
      summary: "目标值待完善",
    };
  }

  return {
    ...goal,
    metricLabel: label,
    summary: goal.mode === "AT_MOST"
      ? `不高于 ${targetValue} ${unit}`
      : `至少 ${targetValue} ${unit}`,
  };
}

function buildExportSummary(payload) {
  const dailyRecordCount = Array.isArray(payload.dailyRecords)
    ? payload.dailyRecords.length
    : 0;
  const goalCount = Array.isArray(payload.goals) ? payload.goals.length : 0;
  const eventCount = Array.isArray(payload.productEvents)
    ? payload.productEvents.length
    : 0;

  return {
    exportedAt: payload.exportedAt,
    user: payload.user,
    profile: payload.profile,
    counts: {
      dailyRecords: dailyRecordCount,
      goals: goalCount,
      productEvents: eventCount,
    },
    dailyRecords: payload.dailyRecords || [],
    goals: payload.goals || [],
  };
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
        goals: (goalsPayload.goals || []).map(formatGoalSummary),
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
        message: payload.message || "已加入等待名单。",
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
      const exportText = JSON.stringify(buildExportSummary(payload), null, 2);

      if (wx.setClipboardData) {
        wx.setClipboardData({
          data: exportText,
          success: () => {
            this.setData({
              message: `数据摘要已复制，共 ${recordCount} 条记录。`,
            });
          },
          fail: () => {
            this.setData({
              message: `数据导出已生成，共 ${recordCount} 条记录。复制失败，可稍后重试。`,
            });
          },
        });
      } else {
        this.setData({
          message: `数据导出已生成，共 ${recordCount} 条记录。当前微信版本不支持自动复制。`,
        });
      }
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
        message: payload.message || "反馈已收到，谢谢。",
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
