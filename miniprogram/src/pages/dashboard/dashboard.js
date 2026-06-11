const { ensureAuthed, request } = require("../../utils/api");

Page({
  data: {
    dashboard: {},
    window: {},
    reminders: [],
    error: "",
  },

  onShow() {
    if (!ensureAuthed()) {
      return;
    }

    this.loadDashboard();
  },

  async loadDashboard() {
    try {
      const payload = await request({
        url: "/api/dashboard?days=7",
      });

      this.setData({
        dashboard: payload.dashboard || {},
        window: payload.dashboard && payload.dashboard.window ? payload.dashboard.window : {},
        reminders: payload.reminders && payload.reminders.reminders ? payload.reminders.reminders : [],
        error: "",
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    }
  },
});
