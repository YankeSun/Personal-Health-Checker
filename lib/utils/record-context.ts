export const DIET_TAG_VALUES = [
  "LIGHT",
  "NORMAL",
  "HEAVY",
  "DINING_OUT",
  "LATE_SNACK",
  "FASTING",
] as const;

export const ACTIVITY_LEVEL_VALUES = ["LOW", "NORMAL", "HIGH"] as const;

export const ENERGY_LEVEL_VALUES = ["LOW", "NORMAL", "GOOD"] as const;

export const WEIGH_TIMING_VALUES = [
  "MORNING",
  "AFTER_MEAL",
  "AFTER_WORKOUT",
  "BEFORE_SLEEP",
] as const;

export type DietTag = (typeof DIET_TAG_VALUES)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVEL_VALUES)[number];
export type EnergyLevel = (typeof ENERGY_LEVEL_VALUES)[number];
export type WeighTiming = (typeof WEIGH_TIMING_VALUES)[number];

export type RecordContextTags = {
  dietTags: DietTag[];
  activityLevel: ActivityLevel | null;
  energyLevel: EnergyLevel | null;
  weighTiming: WeighTiming | null;
};

type RecordContextOption<T extends string> = {
  value: T;
  label: string;
};

export const DIET_TAG_OPTIONS: RecordContextOption<DietTag>[] = [
  { value: "LIGHT", label: "清淡" },
  { value: "NORMAL", label: "正常" },
  { value: "HEAVY", label: "偏多" },
  { value: "DINING_OUT", label: "外食" },
  { value: "LATE_SNACK", label: "夜宵" },
  { value: "FASTING", label: "轻断食" },
];

export const ACTIVITY_LEVEL_OPTIONS: RecordContextOption<ActivityLevel>[] = [
  { value: "LOW", label: "偏少" },
  { value: "NORMAL", label: "正常" },
  { value: "HIGH", label: "较多" },
];

export const ENERGY_LEVEL_OPTIONS: RecordContextOption<EnergyLevel>[] = [
  { value: "LOW", label: "疲惫" },
  { value: "NORMAL", label: "正常" },
  { value: "GOOD", label: "不错" },
];

export const WEIGH_TIMING_OPTIONS: RecordContextOption<WeighTiming>[] = [
  { value: "MORNING", label: "晨起" },
  { value: "AFTER_MEAL", label: "餐后" },
  { value: "AFTER_WORKOUT", label: "运动后" },
  { value: "BEFORE_SLEEP", label: "睡前" },
];

const dietTagSet = new Set<string>(DIET_TAG_VALUES);
const activityLevelSet = new Set<string>(ACTIVITY_LEVEL_VALUES);
const energyLevelSet = new Set<string>(ENERGY_LEVEL_VALUES);
const weighTimingSet = new Set<string>(WEIGH_TIMING_VALUES);

const optionLabelMaps = {
  dietTags: new Map(DIET_TAG_OPTIONS.map((option) => [option.value, option.label])),
  activityLevel: new Map(ACTIVITY_LEVEL_OPTIONS.map((option) => [option.value, option.label])),
  energyLevel: new Map(ENERGY_LEVEL_OPTIONS.map((option) => [option.value, option.label])),
  weighTiming: new Map(WEIGH_TIMING_OPTIONS.map((option) => [option.value, option.label])),
};

export function getDefaultRecordContextTags(): RecordContextTags {
  return {
    dietTags: [],
    activityLevel: null,
    energyLevel: null,
    weighTiming: null,
  };
}

function getObjectValue(value: unknown, key: keyof RecordContextTags) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return (value as Partial<RecordContextTags>)[key];
}

export function normalizeRecordContextTags(value: unknown): RecordContextTags {
  const rawDietTags = getObjectValue(value, "dietTags");
  const dietTags = Array.isArray(rawDietTags)
    ? [...new Set(rawDietTags.filter((tag): tag is DietTag => (
        typeof tag === "string" && dietTagSet.has(tag)
      )))].slice(0, 3)
    : [];
  const rawActivityLevel = getObjectValue(value, "activityLevel");
  const rawEnergyLevel = getObjectValue(value, "energyLevel");
  const rawWeighTiming = getObjectValue(value, "weighTiming");

  return {
    dietTags,
    activityLevel:
      typeof rawActivityLevel === "string" && activityLevelSet.has(rawActivityLevel)
        ? rawActivityLevel as ActivityLevel
        : null,
    energyLevel:
      typeof rawEnergyLevel === "string" && energyLevelSet.has(rawEnergyLevel)
        ? rawEnergyLevel as EnergyLevel
        : null,
    weighTiming:
      typeof rawWeighTiming === "string" && weighTimingSet.has(rawWeighTiming)
        ? rawWeighTiming as WeighTiming
        : null,
  };
}

export function countRecordContextTags(tags: unknown) {
  const normalized = normalizeRecordContextTags(tags);

  return [
    ...normalized.dietTags,
    normalized.activityLevel,
    normalized.energyLevel,
    normalized.weighTiming,
  ].filter(Boolean).length;
}

export function formatRecordContextTags(tags: unknown) {
  return listRecordContextLabels(tags).join(" / ");
}

export function listRecordContextLabels(tags: unknown) {
  const normalized = normalizeRecordContextTags(tags);

  return [
    ...normalized.dietTags.map((tag) => optionLabelMaps.dietTags.get(tag)),
    normalized.activityLevel ? optionLabelMaps.activityLevel.get(normalized.activityLevel) : null,
    normalized.energyLevel ? optionLabelMaps.energyLevel.get(normalized.energyLevel) : null,
    normalized.weighTiming ? optionLabelMaps.weighTiming.get(normalized.weighTiming) : null,
  ].filter((label): label is string => Boolean(label));
}
