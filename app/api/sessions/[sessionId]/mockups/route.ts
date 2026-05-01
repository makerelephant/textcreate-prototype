import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db";

export const runtime = "nodejs";

// Lightweight polling endpoint — returns the current mockups map for a session.
// Used by the client to recover when a generation request's response was lost
// (e.g. Vercel function killed mid-flight) but the mockup did persist to the DB.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, reason: "session_not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, mockups: session.mockups || {} });
}
