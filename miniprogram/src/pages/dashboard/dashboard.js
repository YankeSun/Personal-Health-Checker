const { ensureAuthed, request, toErrorState } = require("../../utils/api");

function toneClass(tone) {
  if (tone === "success") return "tone-success";
  if (tone === "warning") return "tone-warning";
  return "tone-info";
}

function routeFromHref(href) {
  if (!href) return "/pages/dashboard/dashboard";
  if (href.startsWith("/today")) return "/pages/today/today";
  if (href.startsWith("/trends")) return "/pages/trends/trends";
  if (href.startsWith("/settings")) return "/pages/me/me";
  if (href.startsWith("/dashboard")) return "/pages/dashboard/dashboard";
  return "/pages/dashboard/dashboard";
}

function buildFallbackInsight(dashboard) {
  const completed = dashboard.todayCompletedMetrics || 0;
  const total = dashboard.totalTrackedMetrics || 3;

  if (completed < total) {
    return {
      id: "fallback-today",
      tone: "warning",
      title: "今天还差一点",
      description: `已完成 ${completed}/${total}。补齐后，今天就成一组。`,
      actionHref: "/today",
      actionLabel: "继续记录",
    };
  }

  return {
    id: "fallback-trends",
    tone: "success",
      title: "今天这组已完成",
      description: "现在可以看体重和日常线索有没有一起变化。",
    actionHref: "/trends",
    actionLabel: "看体重趋势",
  };
}

function decorateAction(action, index) {
  return {
    ...action,
    route: routeFromHref(action.actionHref),
    toneClass: toneClass(action.tone),
    isPrimary: index === 0,
  };
}

function buildActionCards(dashboard, reminders) {
  const insights = Array.isArray(dashboard.insights) ? dashboard.insights : [];
  const cards = insights.length > 0 ? insights : [buildFallbackInsight(dashboard)];
  const reminderCards = (Array.isArray(reminders) ? reminders : []).slice(0, 1).map((reminder) => ({
    id: reminder.id,
    tone: reminder.tone || "info",
    title: reminder.title,
    description: reminder.description,
    actionHref: reminder.actionHref || "/today",
    actionLabel: reminder.actionLabel || "去看看",
  }));

  return cards.concat(reminderCards).slice(0, 3).map(decorateAction);
}

function decorateMetric(metric) {
  const recorded = Boolean(metric.recorded);
  let statusLabel = recorded ? "已记录" : "待记录";
  let statusClass = recorded ? "metric-recorded" : "metric-missing";

  if (metric.goalMet === true) {
    statusLabel = "已对齐";
    statusClass = "metric-good";
  }

  if (metric.goalMet === false) {
    statusLabel = "待观察";
    statusClass = "metric-watch";
  }

  return {
    ...metric,
    valueLabel: metric.displayValue || "未记录",
    detailLabel: metric.goalDeviationDescription || metric.goalDescription || "保持现在的节奏",
    statusLabel,
    statusClass,
  };
}

function buildWeightContext(rawContext) {
  if (!rawContext) {
    return {
      title: "先留下体重线索",
      description: "连续几天后，体重和日常背景会开始同屏出现。",
      latestDisplay: "--",
      changeDisplay: "暂无变化",
      recordedDays: 0,
      topContextLabels: [],
    };
  }

  return {
    ...rawContext,
    latestDisplay: rawContext.latestDisplay || "--",
    changeDisplay: rawContext.changeDisplay || "暂无变化",
    topContextLabels: rawContext.topContextLabels || [],
  };
}

function buildWindowMetrics(windowSummary) {
  return (windowSummary.metrics || []).map((metric) => ({
    ...metric,
    latestLabel: metric.latestDisplay || "--",
    recordedLabel: `${metric.recordedDays || 0}/${windowSummary.days || 7} 天`,
  }));
}

function buildWindowAttainmentRate(windowSummary) {
  const rates = (windowSummary.metrics || [])
    .map((metric) => metric.attainmentRate)
    .filter((rate) => typeof rate === "number");

  if (rates.length === 0) {
    return 0;
  }

  const total = rates.reduce((sum, rate) => sum + rate, 0);

  return Math.round(total / rates.length);
}

Page({
  data: {
    dashboard: {},
    window: {},
    reminders: [],
    actionCards: [],
    metricRows: [],
    weightContext: buildWeightContext(null),
    windowMetrics: [],
    windowAttainmentRate: 0,
    completionPercent: 0,
    error: "",
    errorDetail: "",
    errorRetryLabel: "",
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
      const dashboard = payload.dashboard || {};
      const windowSummary = dashboard.window || {};
      const reminders = payload.reminders && payload.reminders.reminders
        ? payload.reminders.reminders
        : [];
      const totalMetrics = dashboard.totalTrackedMetrics || 3;
      const completedMetrics = dashboard.todayCompletedMetrics || 0;
      const completionPercent = totalMetrics > 0
        ? Math.round((completedMetrics / totalMetrics) * 100)
        : 0;

      this.setData({
        dashboard,
        window: windowSummary,
        reminders,
        actionCards: buildActionCards(dashboard, reminders),
        metricRows: (dashboard.todayMetrics || []).map(decorateMetric),
        weightContext: buildWeightContext(dashboard.weightContext),
        windowMetrics: buildWindowMetrics(windowSummary),
        windowAttainmentRate: buildWindowAttainmentRate(windowSummary),
        completionPercent,
        error: "",
        errorDetail: "",
        errorRetryLabel: "",
      });
    } catch (error) {
      const errorState = toErrorState(error, { retryLabel: "重新加载" });

      this.setData({
        ...errorState,
      });
    }
  },

  handleAction(event) {
    const route = event.currentTarget.dataset.route || "/pages/today/today";

    wx.switchTab({
      url: route,
    });
  },

  retryLastAction() {
    this.loadDashboard();
  },
});
