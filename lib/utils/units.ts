const KG_TO_LB = 2.20462;
const ML_TO_OZ = 0.033814;

function roundTo(value: number, fractionDigits: number) {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

function formatNumberForInput(value: number, fractionDigits: number) {
  return roundTo(value, fractionDigits)
    .toFixed(fractionDigits)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

export function toDisplayWeightValue(
  weightKg: number,
  unit: "KG" | "LB",
) {
  const value = unit === "KG" ? weightKg : weightKg * KG_TO_LB;
  return roundTo(value, 1);
}

export function toDisplayWaterValue(
  waterMl: number,
  unit: "ML" | "OZ",
) {
  const value = unit === "ML" ? waterMl : waterMl * ML_TO_OZ;
  return roundTo(value, 0);
}

export function toDisplaySleepValue(sleepHours: number) {
  return roundTo(sleepHours, 1);
}

export function toDisplayWeight(
  weightKg: number | null,
  unit: "KG" | "LB",
) {
  if (weightKg === null) {
    return "";
  }

  const value = toDisplayWeightValue(weightKg, unit);
  return formatNumberForInput(value, 1);
}

export function fromDisplayWeight(
  value: string,
  unit: "KG" | "LB",
) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  const normalized = unit === "KG" ? parsed : parsed / KG_TO_LB;
  return roundTo(normalized, 2);
}

export function toDisplayWater(
  waterMl: number | null,
  unit: "ML" | "OZ",
) {
  if (waterMl === null) {
    return "";
  }

  const value = toDisplayWaterValue(waterMl, unit);
  return formatNumberForInput(value, 0);
}

export function fromDisplayWater(
  value: string,
  unit: "ML" | "OZ",
) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  const normalized = unit === "ML" ? parsed : parsed / ML_TO_OZ;
  return Math.round(normalized);
}

export function toDisplaySleep(sleepHours: number | null) {
  if (sleepHours === null) {
    return "";
  }

  return formatNumberForInput(toDisplaySleepValue(sleepHours), 1);
}

export function fromDisplaySleep(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return roundTo(parsed, 1);
}
