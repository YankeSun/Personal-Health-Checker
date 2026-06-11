const { ensureAuthed, request } = require("../../utils/api");

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

function decorateOptions(options, activeValues) {
  return options.map((option) => ({
    ...option,
    active: activeValues.includes(option.value),
  }));
}

Page({
  data: {
    record: {},
    form: {
      sleepHours: "",
      weightKg: "",
      waterMl: "",
      contextTags: emptyTags(),
    },
    completedCount: 0,
    dietOptions: decorateOptions(dietBaseOptions, []),
    activityOptions: decorateOptions(activityBaseOptions, []),
    energyOptions: decorateOptions(energyBaseOptions, []),
    timingOptions: decorateOptions(timingBaseOptions, []),
    saving: false,
    message: "",
    error: "",
  },

  onShow() {
    if (!ensureAuthed()) {
      return;
    }

    this.loadToday();
  },

  async loadToday() {
    try {
      const payload = await request({
        url: "/api/records/today",
      });
      const record = payload.record || {};
      const contextTags = record.contextTags || emptyTags();

      this.setData({
        record,
        form: {
          sleepHours: record.sleepHours === null || record.sleepHours === undefined ? "" : String(record.sleepHours),
          weightKg: record.weightKg === null || record.weightKg === undefined ? "" : String(record.weightKg),
          waterMl: record.waterMl === null || record.waterMl === undefined ? "" : String(record.waterMl),
          contextTags,
        },
        error: "",
      });
      this.refreshDerivedState();
    } catch (error) {
      this.setData({
        error: error.message,
      });
    }
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;

    this.setData({
      [`form.${field}`]: event.detail.value,
      message: "",
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
    });
    this.refreshDerivedState();
  },

  refreshDerivedState() {
    const form = this.data.form;
    const tags = form.contextTags || emptyTags();
    const completedCount = [
      normalizeNumber(form.sleepHours),
      normalizeNumber(form.weightKg),
      normalizeNumber(form.waterMl),
    ].filter((value) => value !== null).length;

    this.setData({
      completedCount,
      dietOptions: decorateOptions(dietBaseOptions, tags.dietTags || []),
      activityOptions: decorateOptions(activityBaseOptions, tags.activityLevel ? [tags.activityLevel] : []),
      energyOptions: decorateOptions(energyBaseOptions, tags.energyLevel ? [tags.energyLevel] : []),
      timingOptions: decorateOptions(timingBaseOptions, tags.weighTiming ? [tags.weighTiming] : []),
    });
  },

  async saveRecord() {
    const form = this.data.form;
    const date = this.data.record.date;

    if (!date) {
      this.setData({
        error: "今天的日期还没有同步完成",
      });
      return;
    }

    this.setData({
      saving: true,
      error: "",
      message: "",
    });

    try {
      await request({
        url: `/api/records/${date}`,
        method: "PUT",
        data: {
          sleepHours: normalizeNumber(form.sleepHours),
          weightKg: normalizeNumber(form.weightKg),
          waterMl: normalizeNumber(form.waterMl),
          contextTags: form.contextTags,
        },
      });
      this.setData({
        message: this.data.completedCount === 3 ? "今日三项已完成" : `已保存 ${this.data.completedCount}/3`,
      });
    } catch (error) {
      this.setData({
        error: error.message,
      });
    } finally {
      this.setData({
        saving: false,
      });
    }
  },
});
