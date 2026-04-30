import { NextRequest, NextResponse } from "next/server";
import { createSessionFromImageUrl, generateHeroForSession } from "@/lib/pipeline";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  const qs = req.nextUrl.searchParams;
  const demoUrl = qs.get("imageUrl") || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800";
  const phone = qs.get("phone") || "+15555550123";
  const simulateDelay = qs.get("simulateDelay") === "true";
  const withHero = qs.get("withHero") === "true";

  if (simulateDelay) await sleep(4000);

  const { sessionId, collectionUrl, session } = await createSessionFromImageUrl({
    sourceImageUrl: demoUrl,
    fromPhone: phone,
    sourceTwilioMediaUrl: null,
    messageSid: null,
  });

  const hero = withHero
    ? await generateHeroForSession(sessionId)
    : { skipped: true, note: "Add ?withHero=true to generate." };

  return NextResponse.json({
    ok: true,
    sessionId,
    collectionUrl,
    analysis: session.analysis,
    itemCount: session.collection_items.length,
    hero,
    simulateDelay,
  });
}
