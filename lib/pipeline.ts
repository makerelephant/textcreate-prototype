import type { CollectionSession } from "@/types";
import { appBaseUrl } from "./config";
import { addGeneratedImage, createSession, getSession, updateSession } from "./db";
import { selectBrandAssets } from "./brand-assets";
import { generateHeroImage } from "./image-gen";
import { generateProductMockup } from "./mockup-gen";
import { analyzeImage } from "./openai";
import { buildCollectionItems } from "./product-matching";
import { storeImage } from "./storage";

type CreateParams = {
  sourceImageUrl: string;
  fromPhone: string;
  sourceTwilioMediaUrl: string | null;
  messageSid: string | null;
};

export async function createSessionFromImageUrl(
  params: CreateParams
): Promise<{ sessionId: string; collectionUrl: string; session: CollectionSession }> {
  const analysis = await analyzeImage(params.sourceImageUrl);
  const items = buildCollectionItems();
  const session = await createSession({
    from_phone: params.fromPhone,
    source_twilio_media_url: params.sourceTwilioMediaUrl,
    message_sid: params.messageSid,
    source_image_url: params.sourceImageUrl,
    analysis,
    collection_items: items,
    collection_url: "",
  });
  const collectionUrl = `${appBaseUrl()}/collections/${session.id}`;
  await updateSession(session.id, { collection_url: collectionUrl });
  return { sessionId: session.id, collectionUrl, session: { ...session, collection_url: collectionUrl } };
}

type HeroResult = { ok: true; heroUrl: string } | { ok: false; reason: string };

export async function generateHeroForSession(sessionId: string): Promise<HeroResult> {
  const session = await getSession(sessionId);
  if (!session) return { ok: false, reason: "session_not_found" };
  if (session.generated_hero_image_url) return { ok: true, heroUrl: session.generated_hero_image_url };

  const assets = await selectBrandAssets(session.collection_items);
  const hero = await generateHeroImage({
    userImageUrl: session.source_image_url,
    items: session.collection_items,
    assets,
    visual: session.analysis.visual_direction,
  });
  if (!hero.outputBuffer) return { ok: false, reason: "no_output_buffer" };

  const heroUrl = await storeImage(hero.outputBuffer, hero.outputMimeType, "hero");
  const rec = await addGeneratedImage({
    session_id: session.id,
    kind: "collection_hero",
    model: hero.model,
    prompt: hero.prompt,
    source_image_urls: hero.sourceImageUrls,
    asset_ids: hero.assetIds,
    openai_response_json: hero.meta,
    output_image_url: heroUrl,
  });
  await updateSession(session.id, {
    generated_hero_image_url: heroUrl,
    generated_image_ids: [rec.id],
  });
  return { ok: true, heroUrl };
}

type MockupResult = { ok: true; mockupUrl: string } | { ok: false; reason: string };

export async function generateMockupForSession(sessionId: string, productId: string): Promise<MockupResult> {
  const session = await getSession(sessionId);
  if (!session) return { ok: false, reason: "session_not_found" };
  if (session.mockups[productId]) return { ok: true, mockupUrl: session.mockups[productId] };

  const result = await generateProductMockup(session.source_image_url, productId);
  if (!result.outputBuffer) return { ok: false, reason: "no_output_buffer" };

  const mockupUrl = await storeImage(result.outputBuffer, result.outputMimeType, `mockup-${productId}`);
  await addGeneratedImage({
    session_id: session.id,
    kind: "product_mockup",
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    prompt: result.prompt,
    source_image_urls: [session.source_image_url],
    asset_ids: [productId],
    openai_response_json: result.meta,
    output_image_url: mockupUrl,
  });

  const updatedMockups = { ...session.mockups, [productId]: mockupUrl };
  await updateSession(session.id, { mockups: updatedMockups });
  return { ok: true, mockupUrl };
}
