import { getObservationSnapshot } from "@/lib/services/observability-service";

async function main() {
  const daysArg = process.argv.find((arg) => arg.startsWith("--days="));
  const days = daysArg ? Number(daysArg.split("=")[1]) : 30;
  const snapshot = await getObservationSnapshot(Number.isFinite(days) ? days : 30);

  console.log(JSON.stringify(snapshot, null, 2));
}

main().catch((error) => {
  console.error("usage report failed", error);
  process.exitCode = 1;
});
