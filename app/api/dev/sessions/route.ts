import { NextResponse } from "next/server";
import { listRecentSessions } from "@/lib/db";

function maskPhone(phone: string) {
  if (!phone) return "unknown";
  const clean = phone.replace(/\D/g, "");
  return `***${clean.slice(-4)}`;
}

export async function GET() {
  // Allow in production if demo mode is enabled
  const allowInProd = process.env.DEMO_MODE_NO_OUTBOUND_SMS === "true";
  if (process.env.NODE_ENV === "production" && !allowInProd) {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const sessions = await listRecentSessions(25);
  return NextResponse.json({
    count: sessions.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      created_at: s.created_at,
      from_phone_masked: maskPhone(s.from_phone),
      collection_url: s.collection_url,
      hero_status: Boolean(s.generated_hero_image_url) ? "generated" : "not_generated",
      item_count: s.collection_items.length,
    })),
  });
}
