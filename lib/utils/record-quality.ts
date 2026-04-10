export type RecordQualityWarning = {
  id: string;
  metric: "sleep" | "weight" | "water";
  title: string;
  description: string;
};

type RecordValues = {
  sleepHours: number | null;
  weightKg: number | null;
  waterMl: number | null;
};

export function getRecordQualityWarnings(values: RecordValues) {
  const warnings: RecordQualityWarning[] = [];

  if (values.sleepHours !== null && (values.sleepHours < 3.5 || values.sleepHours > 12)) {
    warnings.push({
      id: "sleep-outlier",
      metric: "sleep",
      title: "这次睡眠时长偏离常见范围",
      description: "如果不是一次特殊情况，建议再确认一下输入，避免影响趋势判断。",
    });
  }

  if (values.weightKg !== null && (values.weightKg < 35 || values.weightKg > 180)) {
    warnings.push({
      id: "weight-outlier",
      metric: "weight",
      title: "这次体重偏离常见范围",
      description: "如果单位或小数点输错了，趋势会被明显拉偏，建议再检查一次。",
    });
  }

  if (values.waterMl !== null && (values.waterMl < 400 || values.waterMl > 6000)) {
    warnings.push({
      id: "water-outlier",
      metric: "water",
      title: "这次饮水量偏离常见范围",
      description: "如果是分次补录后的累计值可以保留，否则建议再确认一下数字。",
    });
  }

  return warnings;
}
