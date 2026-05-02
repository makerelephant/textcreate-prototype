import OpenAI from "openai";
import { logWarn } from "./logger";

// ============================================================================
// ASSET PRESERVATION RULES — prepended to EVERY product prompt.
// ============================================================================
// gpt-image-1 by default "interprets" the input: it redraws logos, alters
// faces, restyles brand marks. For print-on-demand that's a dealbreaker —
// customers expect their upload printed pixel-for-pixel.
//
// Kept intentionally TIGHT: the previous longer / more verbose version made
// most products fail to generate at all (only the t-shirt rendered). Long
// prompts seem to hit a soft reliability cliff in gpt-image-1's images.edit.
//
// This is best-effort. Only a deterministic compositor (overlay PNG on a
// pre-rendered blank product photo, no AI) GUARANTEES preservation. Tracked
// as a follow-up.
const ASSET_RULES = `ASSET RULE: the provided image is the customer's asset (logo, photo, artwork) for direct print. Reproduce it EXACTLY — do NOT redraw, restyle, recolour, recrop, mirror, rotate, or alter any element. Do NOT add or remove content. Do NOT render text or shapes as embroidery, stitches, or thread — flat print only. Faces, text, and brand marks must be pixel-for-pixel from the source. ONLY transformations permitted: proportional scaling, realistic surface perspective for the product, light material texture overlay.`;

// Per-product mockup prompts. Product descriptions kept short and neutral so
// the model has less room to invent garment colour, angle, or styling.
const PRODUCT_PROMPTS: Record<string, string> = {
  tshirt: `${ASSET_RULES}\n\nApply the design centred on the chest of a heather grey cotton t-shirt laid flat on a soft neutral background. Premium product photography, soft studio lighting, fabric texture and stitching visible.`,

  hoodie: `${ASSET_RULES}\n\nApply the design centred on the chest of a black pullover hoodie with kangaroo pocket and drawstrings, laid flat on a soft neutral background. Premium product photography, studio lighting, fleece texture visible.`,

  mug: `${ASSET_RULES}\n\nApply the design to the visible front of a white ceramic 11oz coffee mug with right-side handle, on a wooden surface. The mug's cylindrical curve is the only additional transform — scale the design down to fit the visible curved surface without cropping. Premium product photography, soft natural lighting, ceramic glaze visible.`,

  tote: `${ASSET_RULES}\n\nApply the design centred on the front panel of a natural canvas tote bag with leather handles, standing upright against a soft neutral background. Premium product photography, studio lighting, canvas weave visible.`,

  towel: `${ASSET_RULES}\n\nApply the design centred on the visible folded section of a folded beach towel resting on light sand, viewed from above-front. Premium product photography, bright natural daylight, microfiber texture visible.`,

  cap: `${ASSET_RULES}\n\nApply the design as a FLAT print (NOT embroidery, NOT thread) on the front centre panel of a black structured 6-panel baseball cap with curved brim, viewed from the front. The cap's gentle front-panel curve is the only additional transform. Premium product photography, studio lighting, fabric weave visible.`,
};

export type MockupResult = {
  productId: string;
  outputBuffer: Buffer | null;
  outputMimeType: string;
  prompt: string;
  meta: Record<string, unknown>;
};

async function urlToFile(url: string): Promise<File | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      logWarn("mockup_source_fetch_failed", { url, status: res.status });
      return null;
    }
    const ab = await res.arrayBuffer();
    return new File([ab], "design.png", { type: res.headers.get("content-type") || "image/png" });
  } catch (e) {
    logWarn("mockup_source_fetch_exception", { url, reason: e instanceof Error ? e.message : "unknown" });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateProductMockup(
  userImageUrl: string,
  productId: string
): Promise<MockupResult> {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const prompt = PRODUCT_PROMPTS[productId] ||
    "Photorealistic product mockup featuring the provided design, premium product photography style.";

  if (!process.env.OPENAI_API_KEY || process.env.ENABLE_IMAGE_GENERATION === "false") {
    return {
      productId,
      outputBuffer: null,
      outputMimeType: "image/png",
      prompt,
      meta: { fallback: true, reason: "disabled_or_missing_key" },
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Edit the user's design into a product mockup. No fallback to images.generate
  // because that path doesn't include the user's design, so it produces a generic
  // product photo that defeats the entire purpose. Better to fail-fast and let
  // the UI mark the tile as failed than to spend another 60s producing a useless image.
  const userFile = await urlToFile(userImageUrl);
  if (!userFile) {
    return {
      productId,
      outputBuffer: null,
      outputMimeType: "image/png",
      prompt,
      meta: { error: "user_file_unavailable" },
    };
  }

  try {
    const edited = await client.images.edit(
      { model, prompt, image: userFile, size: "1024x1024", quality: "low" },
      { timeout: 75_000 }
    );
    const b64 = edited?.data?.[0]?.b64_json;
    if (b64) {
      return {
        productId,
        outputBuffer: Buffer.from(b64, "base64"),
        outputMimeType: "image/png",
        prompt,
        meta: { used: "images.edit" },
      };
    }
    logWarn("mockup_edit_no_b64", { productId });
    return {
      productId,
      outputBuffer: null,
      outputMimeType: "image/png",
      prompt,
      meta: { error: "no_b64_in_response" },
    };
  } catch (e) {
    logWarn("mockup_edit_failed", { productId, reason: e instanceof Error ? e.message : "unknown" });
    return {
      productId,
      outputBuffer: null,
      outputMimeType: "image/png",
      prompt,
      meta: { error: e instanceof Error ? e.message : "unknown" },
    };
  }
}
