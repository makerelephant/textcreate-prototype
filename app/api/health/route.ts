import { NextResponse } from "next/server";
import { getEnvReport } from "@/lib/env";

export async function GET() {
  const report = getEnvReport();
  return NextResponse.json({
    status: report.status,
    environmentWarnings: report.warnings,
    featureFlags: report.featureFlags,
    storageMode: report.storageMode,
    persistenceMode: report.persistenceMode,
    publicAppUrl: report.publicAppUrl,
    now: new Date().toISOString(),
  });
}
