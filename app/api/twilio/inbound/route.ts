import { NextRequest, NextResponse } from "next/server";
import { twiml } from "twilio";
import crypto from "node:crypto";
import { logError, logEvent, logWarn } from "@/lib/logger";
import { warnIfLocalhostPublicUrls } from "@/lib/config";
import { downloadTwilioMedia, isHelpKeyword, isStopKeyword, validateTwilioSig } from "@/lib/twilio";
import { storeImage } from "@/lib/storage";
import { getProcessedMessage, setProcessedMessage } from "@/lib/db";
import { createSessionFromImageUrl } from "@/lib/pipeline";

export const runtime = "nodejs";
// Twilio webhook deadline is 15s; Vercel Pro allows up to 60s. We aim well under 15s.
export const maxDuration = 30;

const path = "/api/twilio/inbound";

function sms(message: string) {
  const r = new twiml.MessagingResponse();
  r.message(message);
  return new NextResponse(r.toString(), { status: 200, headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  warnIfLocalhostPublicUrls();

  const raw = await req.text();
  const params = Object.fromEntries(new URLSearchParams(raw).entries());
  const signature = req.headers.get("x-twilio-signature") || "";
  const messageSid = params.MessageSid || "";
  const from = params.From || "";

  logEvent("twilio_inbound_received", {
    requestId,
    messageSid,
    from,
    numMedia: params.NumMedia,
    mediaUrl0: params.MediaUrl0,
    mediaContentType0: params.MediaContentType0,
  });

  if (!validateTwilioSig(signature, params, path)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const body = (params.Body || "").trim();
  if (body.toUpperCase() === "START") return sms("You're opted in. Send a photo to create a visual collection.");
  if (isStopKeyword(body)) return sms("You're opted out. Reply START to opt back in.");
  if (isHelpKeyword(body)) return sms("Text a photo to create an AI-generated visual collection. Reply STOP to opt out.");
  if (Number(params.NumMedia || "0") < 1 || !params.MediaUrl0) {
    return sms("Send a photo and I'll turn it into a visual collection.");
  }

  // Idempotency: Twilio retries on 5xx or >15s. Same MessageSid → return original URL.
  if (messageSid) {
    try {
      const previous = await getProcessedMessage(messageSid);
      if (previous) {
        logEvent("duplicate_message_sid", { requestId, messageSid, collectionUrl: previous.collectionUrl });
        return sms(`Your visual collection is ready: ${previous.collectionUrl}`);
      }
    } catch (e) {
      logWarn("idempotency_check_failed", { requestId, messageSid, reason: e instanceof Error ? e.message : "unknown" });
    }
  }

  try {
    logEvent("media_download_start", { requestId, messageSid });
    const media = await downloadTwilioMedia(params.MediaUrl0);
    logEvent("media_download_success", { requestId, messageSid, bytes: media.byteLength });

    const sourceImageUrl = await storeImage(media, params.MediaContentType0 || "image/jpeg", "source");
    logEvent("source_image_stored", { requestId, messageSid });

    const { sessionId, collectionUrl } = await createSessionFromImageUrl({
      sourceImageUrl,
      fromPhone: from,
      sourceTwilioMediaUrl: params.MediaUrl0,
      messageSid: messageSid || null,
    });
    logEvent("session_created", { requestId, messageSid, sessionId, collectionUrl });

    if (messageSid) {
      try {
        await setProcessedMessage(messageSid, collectionUrl, sessionId);
      } catch (e) {
        logWarn("set_processed_message_failed", { requestId, messageSid, reason: e instanceof Error ? e.message : "unknown" });
      }
    }

    // Hero generation is intentionally deferred — collection page triggers POST /api/sessions/:id/hero on load.
    // This keeps the webhook well under Twilio's 15s deadline.
    return sms(`Your visual collection is ready: ${collectionUrl}`);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    logError("pipeline_failed", { requestId, messageSid, reason });
    return sms("Sorry — we couldn't create your collection. Please try another photo.");
  }
}
