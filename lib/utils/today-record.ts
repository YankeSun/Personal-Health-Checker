export type RecordCompletionSummary = {
  completedCount: number;
  isComplete: boolean;
  hasAnyValue: boolean;
  missingMetrics: string[];
};

export function getRecordCompletionSummary(values: {
  sleepHours: string;
  weight: string;
  water: string;
}): RecordCompletionSummary {
  const fields = [
    { label: "睡眠", value: values.sleepHours },
    { label: "体重", value: values.weight },
    { label: "饮水", value: values.water },
  ];

  const completedCount = fields.filter((field) => field.value.trim() !== "").length;

  return {
    completedCount,
    isComplete: completedCount === fields.length,
    hasAnyValue: completedCount > 0,
    missingMetrics: fields
      .filter((field) => field.value.trim() === "")
      .map((field) => field.label),
  };
}
