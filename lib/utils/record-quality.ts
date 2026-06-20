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
      title: "睡眠数值不太常见",
      description: "如果不是特殊情况，可以再确认一次，避免拉偏趋势。",
    });
  }

  if (values.weightKg !== null && (values.weightKg < 35 || values.weightKg > 180)) {
    warnings.push({
      id: "weight-outlier",
      metric: "weight",
      title: "体重数值不太常见",
      description: "如果单位或小数点有误，趋势会被明显拉偏。",
    });
  }

  if (values.waterMl !== null && (values.waterMl < 400 || values.waterMl > 6000)) {
    warnings.push({
      id: "water-outlier",
      metric: "water",
      title: "饮水数值不太常见",
      description: "如果是累计补录可以保留，否则建议再确认数字。",
    });
  }

  return warnings;
}
