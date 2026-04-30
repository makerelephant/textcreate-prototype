import { validateRequest } from "twilio";
import { shouldBypassTwilioValidation, webhookBaseUrl } from "./config";
import { logWarn } from "./logger";

export function isStopKeyword(s: string) {
  return ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(s.toUpperCase());
}
export function isHelpKeyword(s: string) {
  return ["HELP", "INFO"].includes(s.toUpperCase());
}

export function validateTwilioSig(signature: string, params: Record<string, string>, path: string): boolean {
  if (shouldBypassTwilioValidation()) return true;
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const url = `${webhookBaseUrl()}${path}`;
  const ok = validateRequest(token, signature, url, params);
  if (!ok) logWarn("twilio_signature_failed", { url, hasSignature: Boolean(signature) });
  return ok;
}

export async function downloadTwilioMedia(url: string): Promise<Buffer> {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`twilio_media_download_failed_${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}
