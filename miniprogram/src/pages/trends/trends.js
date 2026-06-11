const { ensureAuthed, request } = require("../../utils/api");

Page({
  data: {
    trend: {},
    contextSummary: null,
    recentPoints: [],
    error: "",
  },

  onShow() {
    if (!ensureAuthed()) {
      return;
    }

    this.loadTrend();
  },

  async loadTrend() {
    try {
      const payload = await request({
        url: "/api/trends?metric=weight&days=30",
      });
      const trend = payload.trend || {};
      const points = Array.isArray(trend.points) ? trend.points.slice(-7).reverse() : [];

      this.setData({
        trend,
        contextSummary: trend.contextSummary || null,
        recentPoints: points,
        error: "",
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    }
  },
});
