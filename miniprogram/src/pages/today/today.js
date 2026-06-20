const { ensureAuthed, request, toErrorState } = require("../../utils/api");

const KG_TO_LB = 2.20462;
const ML_TO_OZ = 0.033814;

const dietBaseOptions = [
  { value: "LIGHT", label: "清淡" },
  { value: "NORMAL", label: "正常" },
  { value: "HEAVY", label: "偏多" },
  { value: "DINING_OUT", label: "外食" },
  { value: "LATE_SNACK", label: "夜宵" },
  { value: "FASTING", label: "轻断食" },
];

const activityBaseOptions = [
  { value: "LOW", label: "偏少" },
  { value: "NORMAL", label: "正常" },
  { value: "HIGH", label: "较多" },
];

const energyBaseOptions = [
  { value: "LOW", label: "疲惫" },
  { value: "NORMAL", label: "正常" },
  { value: "GOOD", label: "不错" },
];

const timingBaseOptions = [
  { value: "MORNING", label: "晨起" },
  { value: "AFTER_MEAL", label: "餐后" },
  { value: "AFTER_WORKOUT", label: "运动后" },
  { value: "BEFORE_SLEEP", label: "睡前" },
];

function emptyTags() {
  return {
    dietTags: [],
    activityLevel: null,
    energyLevel: null,
    weighTiming: null,
  };
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundTo(value, fractionDigits) {
  const factor = 10 ** fractionDigits;

  return Math.round(value * factor) / factor;
}

function formatNumber(value, fractionDigits) {
  return roundTo(value, fractionDigits)
    .toFixed(fractionDigits)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

function normalizeProfile(profile) {
  return {
    weightUnit: profile && profile.weightUnit === "LB" ? "LB" : "KG",
    waterUnit: profile && profile.waterUnit === "OZ" ? "OZ" : "ML",
  };
}

function getWeightUnitLabel(profile) {
  return profile.weightUnit === "LB" ? "lb" : "kg";
}

function getWaterUnitLabel(profile) {
  return profile.waterUnit === "OZ" ? "oz" : "ml";
}

function toDisplayWeight(weightKg, profile) {
  if (weightKg === null || weightKg === undefined) {
    return "";
  }

  const displayValue = profile.weightUnit === "LB" ? weightKg * KG_TO_LB : weightKg;

  return formatNumber(displayValue, 1);
}

function toDisplayWater(waterMl, profile) {
  if (waterMl === null || waterMl === undefined) {
    return "";
  }

  const displayValue = profile.waterUnit === "OZ" ? waterMl * ML_TO_OZ : waterMl;

  return formatNumber(displayValue, 0);
}

function fromDisplayWeight(value, profile) {
  const parsed = normalizeNumber(value);

  if (parsed === null) {
    return null;
  }

  return profile.weightUnit === "LB" ? roundTo(parsed / KG_TO_LB, 2) : parsed;
}

function fromDisplayWater(value, profile) {
  const parsed = normalizeNumber(value);

  if (parsed === null) {
    return null;
  }

  return profile.waterUnit === "OZ" ? Math.round(parsed / ML_TO_OZ) : parsed;
}

function decorateOptions(options, activeValues) {
  return options.map((option) => ({
    ...option,
    active: activeValues.includes(option.value),
  }));
}

function buildCompletionSteps(form) {
  return [
    {
      key: "weight",
      label: "体重",
      done: normalizeNumber(form.weightKg) !== null,
    },
    {
      key: "sleep",
      label: "睡眠",
      done: normalizeNumber(form.sleepHours) !== null,
    },
    {
      key: "water",
      label: "饮水",
      done: normalizeNumber(form.waterMl) !== null,
    },
  ];
}

function getNextStepText(steps) {
  const nextStep = steps.find((step) => !step.done);

  return nextStep
    ? `还差 ${nextStep.label}`
    : "记录完整，可以看今日概览";
}

function shiftDateString(dateString, offsetDays) {
  const date = new Date(`${dateString}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatShortDateLabel(dateString) {
  if (!dateString) {
    return "同步中";
  }

  const [, month, day] = dateString.split("-");

  return `${Number(month)}/${Number(day)}`;
}

function isTodayDate(dateString, todayDate) {
  return Boolean(dateString && todayDate && dateString === todayDate);
}

function getDateDisplayLabel(dateString, todayDate) {
  if (!dateString) {
    return "同步中";
  }

  return isTodayDate(dateString, todayDate)
    ? `今天 ${formatShortDateLabel(dateString)}`
    : `${formatShortDateLabel(dateString)} 补录`;
}

function getDateActionLabel(dateString, todayDate) {
  return isTodayDate(dateString, todayDate) ? "补录" : "换一天";
}

function getRecordFocusLabel(dateString, todayDate) {
  return isTodayDate(dateString, todayDate) ? "今日称重" : "补录称重";
}

function getSaveButtonLabel(dateString, todayDate) {
  return isTodayDate(dateString, todayDate) ? "保存今天" : "保存补录";
}

function getWeightHint(weightValue, dateString, todayDate) {
  if (weightValue !== null) {
    return "体重已记录";
  }

  return isTodayDate(dateString, todayDate) ? "先填今天体重" : "补上这天体重";
}

function getSaveSuccessMessage(completedCount, isToday) {
  if (completedCount === 3) {
    return isToday ? "今日三项已完成" : "这一天三项已补齐";
  }

  return isToday ? `已保存 ${completedCount}/3` : `已补录 ${completedCount}/3`;
}

Page({
  data: {
    record: {},
    selectedDate: "",
    todayDate: "",
    minRecordDate: "",
    maxRecordDate: "",
    dateDisplayLabel: "同步中",
    dateActionLabel: "补录",
    recordFocusLabel: "今日称重",
    saveButtonLabel: "保存今天",
    profile: normalizeProfile(null),
    form: {
      sleepHours: "",
      weightKg: "",
      waterMl: "",
      contextTags: emptyTags(),
    },
    completedCount: 0,
    completionPercent: 0,
    completionSteps: buildCompletionSteps({
      sleepHours: "",
      weightKg: "",
      waterMl: "",
    }),
    nextStepText: "先记录今天体重",
    weightDisplay: "-- kg",
    weightUnitLabel: "kg",
    waterUnitLabel: "ml",
    weightPlaceholder: "例如 63.2",
    waterPlaceholder: "2000",
    weightHint: "先填今天体重",
    qualityWarnings: [],
    dietOptions: decorateOptions(dietBaseOptions, []),
    activityOptions: decorateOptions(activityBaseOptions, []),
    energyOptions: decorateOptions(energyBaseOptions, []),
    timingOptions: decorateOptions(timingBaseOptions, []),
    loadingRecord: false,
    saving: false,
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

    this.loadToday();
  },

  applyRecordPayload(payload, options = {}) {
    const record = payload.record || {};
    const date = record.date || options.date || this.data.selectedDate;
    const todayDate = options.todayDate || this.data.todayDate || date;
    const maxRecordDate = options.maxRecordDate || this.data.maxRecordDate || todayDate;
    const minRecordDate = options.minRecordDate || this.data.minRecordDate || shiftDateString(maxRecordDate, -364);
    const profile = payload.profile ? normalizeProfile(payload.profile) : this.data.profile;
    const contextTags = record.contextTags || emptyTags();

    this.setData({
      record: {
        ...record,
        date,
      },
      selectedDate: date,
      todayDate,
      minRecordDate,
      maxRecordDate,
      profile,
      form: {
        sleepHours: record.sleepHours === null || record.sleepHours === undefined ? "" : String(record.sleepHours),
        weightKg: toDisplayWeight(record.weightKg, profile),
        waterMl: toDisplayWater(record.waterMl, profile),
        contextTags,
      },
      weightUnitLabel: getWeightUnitLabel(profile),
      waterUnitLabel: getWaterUnitLabel(profile),
      weightPlaceholder: profile.weightUnit === "LB" ? "例如 140" : "例如 63.2",
      waterPlaceholder: profile.waterUnit === "OZ" ? "68" : "2000",
      qualityWarnings: payload.qualityWarnings || [],
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
    });
    this.refreshDerivedState();
  },

  async loadToday() {
    try {
      const payload = await request({
        url: "/api/records/today",
      });
      const todayDate = payload.record && payload.record.date;

      this.applyRecordPayload(payload, {
        date: todayDate,
        todayDate,
        maxRecordDate: todayDate,
        minRecordDate: shiftDateString(todayDate, -364),
      });
    } catch (error) {
      const errorState = toErrorState(error, { retryLabel: "重新加载" });

      this.setData({
        ...errorState,
        errorRetryAction: errorState.errorRetryLabel ? "load" : "",
      });
    }
  },

  async loadRecordByDate(date) {
    if (!date) {
      return;
    }

    this.setData({
      loadingRecord: true,
      selectedDate: date,
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
      qualityWarnings: [],
    });

    try {
      const payload = await request({
        url: isTodayDate(date, this.data.todayDate) ? "/api/records/today" : `/api/records/${date}`,
      });

      this.applyRecordPayload(payload, {
        date,
      });
    } catch (error) {
      const errorState = toErrorState(error, { retryLabel: "重新加载" });

      this.setData({
        ...errorState,
        errorRetryAction: errorState.errorRetryLabel ? "loadDate" : "",
      });
    } finally {
      this.setData({
        loadingRecord: false,
      });
    }
  },

  handleDateChange(event) {
    const date = event.detail.value;

    if (!date || date === this.data.selectedDate) {
      return Promise.resolve();
    }

    return this.loadRecordByDate(date);
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;

    this.setData({
      [`form.${field}`]: event.detail.value,
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
      qualityWarnings: [],
    });
    this.refreshDerivedState();
  },

  toggleDiet(event) {
    const value = event.currentTarget.dataset.value;
    const current = this.data.form.contextTags.dietTags || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : current.length >= 3
        ? current
        : current.concat(value);

    this.setData({
      "form.contextTags.dietTags": next,
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
      qualityWarnings: [],
    });
    this.refreshDerivedState();
  },

  toggleSingleContext(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.currentTarget.dataset.value;
    const current = this.data.form.contextTags[field];

    this.setData({
      [`form.contextTags.${field}`]: current === value ? null : value,
      message: "",
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
      qualityWarnings: [],
    });
    this.refreshDerivedState();
  },

  refreshDerivedState() {
    const form = this.data.form;
    const tags = form.contextTags || emptyTags();
    const completionSteps = buildCompletionSteps(form);
    const completedCount = completionSteps.filter((step) => step.done).length;
    const weightValue = normalizeNumber(form.weightKg);
    const weightUnitLabel = this.data.weightUnitLabel || "kg";
    const selectedDate = this.data.selectedDate || this.data.record.date;
    const todayDate = this.data.todayDate || selectedDate;

    this.setData({
      completedCount,
      completionPercent: Math.round((completedCount / 3) * 100),
      completionSteps,
      nextStepText: getNextStepText(completionSteps),
      weightDisplay: weightValue === null ? `-- ${weightUnitLabel}` : `${form.weightKg} ${weightUnitLabel}`,
      weightHint: getWeightHint(weightValue, selectedDate, todayDate),
      dateDisplayLabel: getDateDisplayLabel(selectedDate, todayDate),
      dateActionLabel: getDateActionLabel(selectedDate, todayDate),
      recordFocusLabel: getRecordFocusLabel(selectedDate, todayDate),
      saveButtonLabel: getSaveButtonLabel(selectedDate, todayDate),
      dietOptions: decorateOptions(dietBaseOptions, tags.dietTags || []),
      activityOptions: decorateOptions(activityBaseOptions, tags.activityLevel ? [tags.activityLevel] : []),
      energyOptions: decorateOptions(energyBaseOptions, tags.energyLevel ? [tags.energyLevel] : []),
      timingOptions: decorateOptions(timingBaseOptions, tags.weighTiming ? [tags.weighTiming] : []),
    });
  },

  async saveRecord() {
    const form = this.data.form;
    const date = this.data.selectedDate || this.data.record.date;

    if (!date) {
      this.setData({
        error: "记录日期还没有同步完成",
        errorDetail: "",
        errorRetryLabel: "",
        errorRetryAction: "",
      });
      return;
    }

    if (this.data.completedCount === 0) {
      this.setData({
        error: "至少先记录一项数据",
        errorDetail: "",
        errorRetryLabel: "",
        errorRetryAction: "",
      });
      return;
    }

    this.setData({
      saving: true,
      error: "",
      errorDetail: "",
      errorRetryLabel: "",
      errorRetryAction: "",
      message: "",
    });

    try {
      const completedCount = this.data.completedCount;
      const isToday = isTodayDate(date, this.data.todayDate);
      const payload = await request({
        url: `/api/records/${date}`,
        method: "PUT",
        data: {
          sleepHours: normalizeNumber(form.sleepHours),
          weightKg: fromDisplayWeight(form.weightKg, this.data.profile),
          waterMl: fromDisplayWater(form.waterMl, this.data.profile),
          contextTags: form.contextTags,
        },
      });
      const savedRecord = payload.record || this.data.record;
      this.setData({
        record: savedRecord,
        qualityWarnings: payload.qualityWarnings || [],
        message: getSaveSuccessMessage(completedCount, isToday),
        error: "",
        errorDetail: "",
        errorRetryLabel: "",
        errorRetryAction: "",
      });
      this.refreshDerivedState();
    } catch (error) {
      const errorState = toErrorState(error, { retryLabel: "重新保存" });

      this.setData({
        ...errorState,
        errorRetryAction: errorState.errorRetryLabel ? "save" : "",
      });
    } finally {
      this.setData({
        saving: false,
      });
    }
  },

  goDashboard() {
    wx.switchTab({
      url: "/pages/dashboard/dashboard",
    });
  },

  retryLastAction() {
    if (this.data.errorRetryAction === "save") {
      this.saveRecord();
      return;
    }

    if (this.data.errorRetryAction === "loadDate") {
      this.loadRecordByDate(this.data.selectedDate || this.data.todayDate);
      return;
    }

    this.loadToday();
  },
});
