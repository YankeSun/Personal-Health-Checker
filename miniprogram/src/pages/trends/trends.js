const { ensureAuthed, request } = require("../../utils/api");

function toneClass(tone) {
  if (tone === "success") return "tone-success";
  if (tone === "warning") return "tone-warning";
  return "tone-info";
}

function buildInsight(trend) {
  const insight = trend.insight || {};

  return {
    toneClass: toneClass(insight.tone),
    title: insight.title || "先积累体重趋势",
    description: insight.description || "连续记录几天后，这里会显示更清楚的体重变化。",
  };
}

function buildComparison(trend) {
  const comparison = trend.comparison || {};

  if (comparison.averageDeltaDisplay) {
    return {
      title: "相比上一周期",
      value: comparison.averageDeltaDisplay,
      description: comparison.previousAverageDisplay
        ? `上一周期平均 ${comparison.previousAverageDisplay}，这次变化可以作为回看线索。`
        : "上一周期记录较少，这次变化先作为参考。",
      directionClass: `delta-${comparison.averageDeltaDirection || "none"}`,
    };
  }

  if (comparison.previousAverageDisplay) {
    return {
      title: "相比上一周期",
      value: "基本接近",
      description: `上一周期平均 ${comparison.previousAverageDisplay}，目前没有明显变化。`,
      directionClass: "delta-flat",
    };
  }

  return {
    title: "相比上一周期",
    value: "待积累",
    description: "上一周期记录还不够，先连续记录几天再看变化。",
    directionClass: "delta-none",
  };
}

function buildTrendAction(trend) {
  const days = trend.days || 30;
  const recordedDays = trend.recordedDays || 0;
  const contextSummary = trend.contextSummary;

  if (recordedDays === 0) {
    return {
      title: "先记录第一条体重",
      description: "有了第一条记录后，趋势页才会开始变得有意义。",
      label: "去记录今天",
      route: "/pages/today/today",
    };
  }

  if (recordedDays < Math.ceil(days * 0.35)) {
    return {
      title: "先把记录密度补起来",
      description: `当前窗口只有 ${recordedDays}/${days} 天体重记录，趋势还容易被缺口影响。`,
      label: "继续记录",
      route: "/pages/today/today",
    };
  }

  if (contextSummary && contextSummary.taggedDays === 0) {
    return {
      title: "给体重补一点背景",
      description: "下次记录时补充饮食、活动量或称重时段，趋势会更容易读懂。",
      label: "补充今天背景",
      route: "/pages/today/today",
    };
  }

  return {
    title: "回到今日记录",
    description: "保持每天一条体重记录，后续变化会更容易看出来。",
    label: "记录今天",
    route: "/pages/today/today",
  };
}

function buildSparkPoints(points, unitLabel) {
  const recent = Array.isArray(points) ? points.slice(-14) : [];
  const values = recent
    .map((point) => point.value)
    .filter((value) => typeof value === "number");
  const minValue = values.length > 0 ? Math.min(...values) : null;
  const maxValue = values.length > 0 ? Math.max(...values) : null;
  const range = minValue === null || maxValue === null ? 0 : maxValue - minValue;

  return recent.map((point) => {
    const hasValue = typeof point.value === "number";
    const heightPercent = !hasValue
      ? 12
      : range === 0
        ? 58
        : Math.round(24 + ((point.value - minValue) / range) * 62);

    return {
      date: point.date,
      label: point.label,
      valueLabel: hasValue ? `${point.value} ${unitLabel}` : "未记录",
      heightPercent,
      hasValue,
      isBackfilled: Boolean(point.isBackfilled),
      barClass: hasValue
        ? point.isBackfilled
          ? "spark-bar-backfilled"
          : "spark-bar-recorded"
        : "spark-bar-empty",
    };
  });
}

function buildRecentPoints(points, unitLabel) {
  return (Array.isArray(points) ? points.slice(-7).reverse() : []).map((point) => ({
    ...point,
    valueLabel: point.value === null ? "未记录" : `${point.value} ${unitLabel}`,
    sourceLabel: point.isBackfilled ? "补录" : "当天",
    sourceClass: point.isBackfilled ? "source-backfilled" : "source-current",
  }));
}

Page({
  data: {
    trend: {},
    insight: buildInsight({}),
    comparison: buildComparison({}),
    trendAction: buildTrendAction({}),
    contextSummary: null,
    sparkPoints: [],
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
      const unitLabel = trend.unitLabel || "kg";

      this.setData({
        trend,
        insight: buildInsight(trend),
        comparison: buildComparison(trend),
        trendAction: buildTrendAction(trend),
        contextSummary: trend.contextSummary || null,
        sparkPoints: buildSparkPoints(trend.points, unitLabel),
        recentPoints: buildRecentPoints(trend.points, unitLabel),
        error: "",
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    }
  },

  handleTrendAction(event) {
    const route = event.currentTarget.dataset.route || "/pages/today/today";

    wx.switchTab({
      url: route,
    });
  },
});
