import { NextRequest, NextResponse } from "next/server";
import { generateHeroForSession } from "@/lib/pipeline";
import { logError, logEvent } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  logEvent("hero_generation_start", { sessionId });
  try {
    const result = await generateHeroForSession(sessionId);
    if (!result.ok) {
      logEvent("hero_generation_skipped", { sessionId, reason: result.reason });
      return NextResponse.json(result, { status: result.reason === "session_not_found" ? 404 : 200 });
    }
    logEvent("hero_generation_success", { sessionId, heroUrl: result.heroUrl });
    return NextResponse.json(result);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    logError("hero_generation_failed", { sessionId, reason });
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
