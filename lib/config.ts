import { logWarn } from "./logger";

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function webhookBaseUrl() {
  return process.env.PUBLIC_WEBHOOK_BASE_URL || appBaseUrl();
}

export function shouldBypassTwilioValidation() {
  return process.env.DISABLE_TWILIO_SIGNATURE_VALIDATION === "true";
}

export function warnIfLocalhostPublicUrls() {
  const base = appBaseUrl();
  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    logWarn("public_url_localhost_warning", {
      message: "NEXT_PUBLIC_APP_URL points to localhost. Twilio/OpenAI cannot access localhost URLs.",
      base,
    });
  }
}
