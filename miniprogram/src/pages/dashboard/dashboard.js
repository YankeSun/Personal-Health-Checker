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
  const remaining = Math.max(total - completed, 0);

  if (completed < total) {
    return {
      id: "fallback-today",
      tone: "warning",
      title: "补上今日记录",
      description: `已记录 ${completed}/${total}，还差 ${remaining} 项。`,
      actionHref: "/today",
      actionLabel: "继续记录",
    };
  }

  return {
    id: "fallback-trends",
    tone: "success",
    title: "今日记录已完成",
    description: "可以查看近期趋势。",
    actionHref: "/trends",
    actionLabel: "查看趋势",
  };
}

function getActionKicker(action, index) {
  const href = action.actionHref || "";

  if (href.startsWith("/today")) return index === 0 ? "今日记录" : "记录提醒";
  if (href.startsWith("/trends")) return index === 0 ? "近期趋势" : "趋势";
  if (href.startsWith("/settings")) return "目标";
  return index === 0 ? "今日重点" : "下一步";
}

function decorateAction(action, index) {
  return {
    ...action,
    kicker: getActionKicker(action, index),
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
    actionLabel: reminder.actionLabel || "查看",
  }));

  return cards.concat(reminderCards).slice(0, 3).map(decorateAction);
}

function decorateMetric(metric) {
  const recorded = Boolean(metric.recorded);
  let statusLabel = recorded ? "已记录" : "待记录";
  let statusClass = recorded ? "metric-recorded" : "metric-missing";

  if (metric.goalMet === true) {
    statusLabel = "已达成";
    statusClass = "metric-good";
  }

  if (metric.goalMet === false) {
    statusLabel = "待观察";
    statusClass = "metric-watch";
  }

  return {
    ...metric,
    valueLabel: metric.displayValue || "缺口",
    detailLabel: metric.goalDeviationDescription || metric.goalDescription || "保持当前节奏",
    statusLabel,
    statusClass,
  };
}

function buildWeightContext(rawContext) {
  if (!rawContext) {
    return {
      title: "开始记录体重",
      description: "连续几天后，体重趋势会更清楚。",
      latestDisplay: "--",
      changeDisplay: "暂无",
      recordedDays: 0,
      topContextLabels: [],
    };
  }

  return {
    ...rawContext,
    latestDisplay: rawContext.latestDisplay || "--",
    changeDisplay: rawContext.changeDisplay || "暂无",
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
