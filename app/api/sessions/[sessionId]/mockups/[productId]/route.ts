import { NextRequest, NextResponse } from "next/server";
import { generateMockupForSession } from "@/lib/pipeline";
import { logError, logEvent } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; productId: string }> }
) {
  const { sessionId, productId } = await params;
  logEvent("mockup_generation_start", { sessionId, productId });
  try {
    const result = await generateMockupForSession(sessionId, productId);
    if (!result.ok) {
      logEvent("mockup_generation_skipped", { sessionId, productId, reason: result.reason });
      return NextResponse.json(result, { status: result.reason === "session_not_found" ? 404 : 200 });
    }
    logEvent("mockup_generation_success", { sessionId, productId, mockupUrl: result.mockupUrl });
    return NextResponse.json(result);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    logError("mockup_generation_failed", { sessionId, productId, reason });
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
