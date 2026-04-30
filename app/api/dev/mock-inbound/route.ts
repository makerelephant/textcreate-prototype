import { NextRequest, NextResponse } from "next/server";
import { createSession, updateSession, addGeneratedImage } from "@/lib/db";
import { analyzeImage } from "@/lib/openai";
import { buildCollectionItems } from "@/lib/product-matching";
import { selectBrandAssets } from "@/lib/brand-assets";
import { generateHeroImage } from "@/lib/image-gen";
import { storeImage } from "@/lib/storage";
import { appBaseUrl } from "@/lib/config";

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export async function POST(req: NextRequest) {
  const qs = req.nextUrl.searchParams;
  const demoUrl = qs.get("imageUrl") || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800";
  const phone = qs.get("phone") || "+15555550123";
  const simulateDelay = qs.get("simulateDelay") === "true";

  if (simulateDelay) await sleep(4000);

  const analysis = await analyzeImage(demoUrl);
  const items = buildCollectionItems(analysis);
  const session = await createSession({ from_phone: phone, source_twilio_media_url: null, message_sid: null, source_image_url: demoUrl, analysis, collection_items: items, collection_url: "" });
  const collectionUrl = `${appBaseUrl()}/collections/${session.id}`;
  await updateSession(session.id, { collection_url: collectionUrl });

  const assets = await selectBrandAssets(items);
  const hero = await generateHeroImage({ userImageUrl: demoUrl, items, assets, visual: analysis.visual_direction });
  let heroStatus: "generated" | "skipped_or_failed" = "skipped_or_failed";

  if (hero.outputBuffer) {
    const heroUrl = await storeImage(hero.outputBuffer, hero.outputMimeType, "hero");
    const rec = await addGeneratedImage({ session_id: session.id, kind: "collection_hero", model: hero.model, prompt: hero.prompt, source_image_urls: hero.sourceImageUrls, asset_ids: hero.assetIds, openai_response_json: hero.meta, output_image_url: heroUrl });
    await updateSession(session.id, { generated_hero_image_url: heroUrl, generated_image_ids: [rec.id] });
    heroStatus = "generated";
  }

  return NextResponse.json({ ok: true, sessionId: session.id, collectionUrl, analysis, itemCount: items.length, heroGenerationStatus: heroStatus, simulateDelay });
}
