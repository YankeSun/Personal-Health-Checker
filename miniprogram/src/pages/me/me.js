const { clearAuth, ensureAuthed, request } = require("../../utils/api");

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

  setFeedbackRating(event) {
    this.setData({
      "feedback.rating": Number(event.currentTarget.dataset.rating),
      message: "",
    });
  },

  selectFeedbackValue(event) {
    const value = event.currentTarget.dataset.value;

    this.setData({
      "feedback.valueCue": value,
      feedbackValueOptions: decorateOptions(feedbackValueOptions, value),
      message: "",
    });
  },

  selectFeedbackFriction(event) {
    const value = event.currentTarget.dataset.value;

    this.setData({
      "feedback.friction": value,
      feedbackFrictionOptions: decorateOptions(feedbackFrictionOptions, value),
      message: "",
    });
  },

  handleFeedbackComment(event) {
    this.setData({
      "feedback.comment": event.detail.value,
      message: "",
    });
  },

  async submitFeedback() {
    const feedback = this.data.feedback;

    if (!feedback.rating || !feedback.valueCue || !feedback.friction) {
      this.setData({
        error: "请先选择评分、最有用的点和最卡的点",
      });
      return;
    }

    this.setData({
      submittingFeedback: true,
      message: "",
      error: "",
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
        "feedback.comment": "",
      });
    } catch (error) {
      this.setData({
        error: error.message,
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
