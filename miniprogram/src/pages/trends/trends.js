const { ensureAuthed, request, toErrorState } = require("../../utils/api");

function toneClass(tone) {
  if (tone === "success") return "tone-success";
  if (tone === "warning") return "tone-warning";
  return "tone-info";
}

function buildInsight(trend) {
  const insight = trend.insight || {};

  return {
    toneClass: toneClass(insight.tone),
    title: insight.title || "开始记录体重",
    description: insight.description || "记录几天后，趋势会更清楚。",
  };
}

function buildComparison(trend) {
  const comparison = trend.comparison || {};

  if (comparison.averageDeltaDisplay) {
    return {
      title: "和上一段比",
      value: comparison.averageDeltaDisplay,
      description: comparison.previousAverageDisplay
        ? `上一段平均 ${comparison.previousAverageDisplay}，本段变化可作参考。`
        : "上一段记录较少，暂不比较。",
      directionClass: `delta-${comparison.averageDeltaDirection || "none"}`,
    };
  }

  if (comparison.previousAverageDisplay) {
    return {
      title: "和上一段比",
      value: "基本接近",
      description: `上一段平均 ${comparison.previousAverageDisplay}，变化不明显。`,
      directionClass: "delta-flat",
    };
  }

  return {
    title: "和上一段比",
    value: "待积累",
    description: "记录更多后再比较。",
    directionClass: "delta-none",
  };
}

function buildTrendAction(trend) {
  const days = trend.days || 30;
  const recordedDays = trend.recordedDays || 0;
  const contextSummary = trend.contextSummary;

  if (recordedDays === 0) {
    return {
      title: "记录第一条体重",
      description: "有记录后，趋势才会出现。",
      label: "记录今天",
      route: "/pages/today/today",
    };
  }

  if (recordedDays < Math.ceil(days * 0.35)) {
    return {
      title: "记录还不连续",
      description: `近 ${days} 天记录 ${recordedDays}/${days} 天。`,
      label: "继续记录",
      route: "/pages/today/today",
    };
  }

  if (contextSummary && contextSummary.taggedDays === 0) {
    return {
      title: "添加日常标签",
      description: "饮食、活动和称重时段可帮助回顾趋势。",
      label: "补今天",
      route: "/pages/today/today",
    };
  }

  return {
    title: "回到今天",
    description: "保持记录，趋势会更清楚。",
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
      valueLabel: hasValue ? `${point.value} ${unitLabel}` : "缺口",
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
    valueLabel: point.value === null ? "缺口" : `${point.value} ${unitLabel}`,
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
    errorDetail: "",
    errorRetryLabel: "",
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

  handleTrendAction(event) {
    const route = event.currentTarget.dataset.route || "/pages/today/today";

    wx.switchTab({
      url: route,
    });
  },

  retryLastAction() {
    this.loadTrend();
  },
});
