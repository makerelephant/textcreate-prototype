import { appBaseUrl } from "./config";

export type EnvReport = {
  status: "ok" | "warn";
  warnings: string[];
  featureFlags: { imageGenerationEnabled: boolean; signatureValidationDisabled: boolean };
  storageMode: "local_public_uploads";
  persistenceMode: "json_file";
  publicAppUrl: string;
};

export function getEnvReport(): EnvReport {
  const warnings: string[] = [];
  const publicAppUrl = appBaseUrl();
  const imageGenerationEnabled = process.env.ENABLE_IMAGE_GENERATION !== "false";
  const signatureValidationDisabled = process.env.DISABLE_TWILIO_SIGNATURE_VALIDATION === "true";

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) warnings.push("Missing Twilio credentials (SID, token, or phone number).");
  if (!process.env.OPENAI_API_KEY) warnings.push("OPENAI_API_KEY is missing.");
  if (publicAppUrl.includes("localhost") || publicAppUrl.includes("127.0.0.1")) warnings.push("Public app URL points to localhost; Twilio/OpenAI cannot reach local URLs.");
  if (signatureValidationDisabled) warnings.push("Twilio signature validation is disabled.");
  if (imageGenerationEnabled && !process.env.OPENAI_API_KEY) warnings.push("Image generation enabled but OPENAI_API_KEY is missing.");
  if (process.env.NODE_ENV === "production") warnings.push("Production currently uses JSON file persistence; use a durable datastore before live scale.");

  return {
    status: warnings.length ? "warn" : "ok",
    warnings,
    featureFlags: { imageGenerationEnabled, signatureValidationDisabled },
    storageMode: "local_public_uploads",
    persistenceMode: "json_file",
    publicAppUrl,
  };
}
