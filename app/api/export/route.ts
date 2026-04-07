import { getCurrentUser } from "@/lib/auth/session";
import { getDailyRecordsByUserAndDateRange } from "@/lib/services/daily-record-service";
import { getZodErrorMessage, jsonError } from "@/lib/utils/api";
import {
  toDisplaySleepValue,
  toDisplayWaterValue,
  toDisplayWeightValue,
} from "@/lib/utils/units";
import { exportRecordsQuerySchema } from "@/lib/validations/records";

type ExportProfile = {
  timezone: string;
  weightUnit: "KG" | "LB";
  waterUnit: "ML" | "OZ";
};

function buildExportRows(
  records: Awaited<ReturnType<typeof getDailyRecordsByUserAndDateRange>>,
  profile: ExportProfile,
) {
  return records.map((record) => ({
    date: record.date,
    sleepHours: record.sleepHours === null ? null : toDisplaySleepValue(record.sleepHours),
    weight:
      record.weightKg === null
        ? null
        : toDisplayWeightValue(record.weightKg, profile.weightUnit),
    weightUnit: profile.weightUnit,
    water:
      record.waterMl === null
        ? null
        : toDisplayWaterValue(record.waterMl, profile.waterUnit),
    waterUnit: profile.waterUnit,
  }));
}

function escapeCsvCell(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("未登录", 401);
  }

  if (!user.profile) {
    return jsonError("用户资料不存在", 404);
  }

  const parseResult = exportRecordsQuerySchema.safeParse({
    format: new URL(request.url).searchParams.get("format") ?? "csv",
    from: new URL(request.url).searchParams.get("from"),
    to: new URL(request.url).searchParams.get("to"),
  });

  if (!parseResult.success) {
    return jsonError(getZodErrorMessage(parseResult.error), 400);
  }

  const records = await getDailyRecordsByUserAndDateRange(
    user.id,
    parseResult.data.from,
    parseResult.data.to,
  );
  const exportRows = buildExportRows(records, user.profile);
  const filenameBase = `health-tracker-${parseResult.data.from}-${parseResult.data.to}`;

  if (parseResult.data.format === "json") {
    return Response.json(
      {
        exportedAt: new Date().toISOString(),
        range: {
          from: parseResult.data.from,
          to: parseResult.data.to,
        },
        profile: {
          timezone: user.profile.timezone,
          weightUnit: user.profile.weightUnit,
          waterUnit: user.profile.waterUnit,
        },
        records: exportRows,
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
        },
      },
    );
  }

  const csvRows = [
    ["date", "sleepHours", "weight", "weightUnit", "water", "waterUnit"].join(","),
    ...exportRows.map((record) =>
      [
        record.date,
        record.sleepHours,
        record.weight,
        record.weightUnit,
        record.water,
        record.waterUnit,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];

  return new Response(`\uFEFF${csvRows.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
