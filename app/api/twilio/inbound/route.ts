import { NextRequest, NextResponse } from "next/server";
import { twiml } from "twilio";
import crypto from "node:crypto";
import { logError, logEvent, logWarn } from "@/lib/logger";
import { warnIfLocalhostPublicUrls } from "@/lib/config";
import { validateTwilioSig, isHelpKeyword, isStopKeyword, downloadTwilioMedia } from "@/lib/twilio";
import { storeImage } from "@/lib/storage";
import { analyzeImage } from "@/lib/openai";
import { buildCollectionItems } from "@/lib/product-matching";
import { selectBrandAssets } from "@/lib/brand-assets";
import { generateHeroImage } from "@/lib/image-gen";
import { addGeneratedImage, createSession, getProcessedMessage, setProcessedMessage, updateSession } from "@/lib/db";
import { appBaseUrl } from "@/lib/config";
import { sendSms } from "@/lib/send-sms";

export const runtime = "nodejs";
const path = "/api/twilio/inbound";

function isDemoNoOutboundSms() {
  return process.env.DEMO_MODE_NO_OUTBOUND_SMS === "true";
}

function sms(message: string) {
  const r = new twiml.MessagingResponse();
  r.message(message);
  return new NextResponse(r.toString(), { status: 200, headers: { "Content-Type": "text/xml" } });
}

async function maybeSendSms(to: string, body: string, meta: Record<string, unknown>) {
  if (isDemoNoOutboundSms()) {
    logWarn("demo_mode_no_outbound_sms_skipped", { ...meta, to, body });
    return;
  }
  await sendSms(to, body);
}

async function processInbound(params: Record<string, string>, requestId: string, messageSid: string) {
  const from = params.From || "";
  try {
    if (messageSid) {
      const previous = await getProcessedMessage(messageSid);
      if (previous) {
        logEvent("duplicate_message_sid", { requestId, messageSid, collectionUrl: previous.collectionUrl });
        await maybeSendSms(from, `Your visual collection is ready: ${previous.collectionUrl}`, { requestId, messageSid, collectionUrl: previous.collectionUrl });
        return;
      }
    }

    logEvent("media_download_start", { requestId, messageSid });
    const media = await downloadTwilioMedia(params.MediaUrl0);
    logEvent("media_download_success", { requestId, messageSid, bytes: media.byteLength });

    let sourceImageUrl = "";
    try {
      sourceImageUrl = await storeImage(media, params.MediaContentType0 || "image/jpeg", "source");
      logEvent("image_stored", { requestId, messageSid, sourceImageUrl });
    } catch (e) {
      logError("storage_failed", { requestId, messageSid, reason: e instanceof Error ? e.message : "unknown" });
      throw e;
    }

    logEvent("openai_analysis_start", { requestId, messageSid });
    let analysis;
    try {
      analysis = await analyzeImage(sourceImageUrl);
      logEvent("openai_analysis_success", { requestId, messageSid, category: analysis.product_category });
    } catch (e) {
      logError("openai_failed", { requestId, messageSid, reason: e instanceof Error ? e.message : "unknown" });
      throw e;
    }

    const items = buildCollectionItems(analysis);
    logEvent("product_matching_result", { requestId, messageSid, count: items.length });

    const session = await createSession({ from_phone: from, source_twilio_media_url: params.MediaUrl0, message_sid: messageSid || null, source_image_url: sourceImageUrl, analysis, collection_items: items, collection_url: "" });
    const collectionUrl = `${appBaseUrl()}/collections/${session.id}`;
    await updateSession(session.id, { collection_url: collectionUrl });
    logEvent("session_created", { requestId, messageSid, sessionId: session.id, collectionUrl });

    try {
      logEvent("hero_generation_start", { requestId, messageSid });
      const assets = await selectBrandAssets(items);
      const hero = await generateHeroImage({ userImageUrl: sourceImageUrl, items, assets, visual: analysis.visual_direction });
      if (hero.outputBuffer) {
        const heroUrl = await storeImage(hero.outputBuffer, hero.outputMimeType, "hero");
        const rec = await addGeneratedImage({ session_id: session.id, kind: "collection_hero", model: hero.model, prompt: hero.prompt, source_image_urls: hero.sourceImageUrls, asset_ids: hero.assetIds, openai_response_json: hero.meta, output_image_url: heroUrl });
        await updateSession(session.id, { generated_hero_image_url: heroUrl, generated_image_ids: [rec.id] });
        logEvent("hero_generation_success", { requestId, messageSid, heroUrl });
      } else {
        logWarn("hero_generation_failed", { requestId, messageSid, reason: "no_output_buffer" });
      }
    } catch (e) {
      logWarn("image_generation_failed", { requestId, messageSid, reason: e instanceof Error ? e.message : "unknown" });
    }

    if (messageSid) await setProcessedMessage(messageSid, collectionUrl, session.id);
    logEvent("collection_ready", { requestId, messageSid, collectionUrl, demoModeNoOutboundSms: isDemoNoOutboundSms() });
    await maybeSendSms(from, `Your visual collection is ready: ${collectionUrl}`, { requestId, messageSid, collectionUrl });
    logEvent("response_sent", { requestId, messageSid, to: from, collectionUrl, skippedOutboundSms: isDemoNoOutboundSms() });
  } catch (e) {
    logError("pipeline_failed", { requestId, messageSid, reason: e instanceof Error ? e.message : "unknown" });
    await maybeSendSms(from, "Sorry — we couldn’t create your collection. Please try another photo.", { requestId, messageSid, failure: true });
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  warnIfLocalhostPublicUrls();
  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw).entries());
  const signature = req.headers.get("x-twilio-signature") || "";
  const messageSid = params.MessageSid || "";
  logEvent("Twilio inbound received", { requestId, messageSid, from: params.From, numMedia: params.NumMedia, mediaUrl0: params.MediaUrl0, mediaContentType0: params.MediaContentType0, demoModeNoOutboundSms: isDemoNoOutboundSms() });

  if (!validateTwilioSig(signature, params, path)) return new NextResponse("Invalid signature", { status: 403 });
  const body = (params.Body || "").trim();
  if (body.toUpperCase() === "START") return sms("You’re opted in. Send a photo to create a visual collection.");
  if (isStopKeyword(body)) return sms("You’re opted out. Reply START to opt back in.");
  if (isHelpKeyword(body)) return sms("Text a photo to create an AI-generated visual collection. Reply STOP to opt out.");
  if (Number(params.NumMedia || "0") < 1 || !params.MediaUrl0) return sms("Send a photo and I’ll turn it into a visual collection.");

  Promise.resolve().then(() => processInbound(params, requestId, messageSid));
  return sms(isDemoNoOutboundSms() ? "Got your photo. Building your collection now. View it on the demo page shortly." : "Got your photo. Building your collection now…");
}
