import OpenAI from "openai";
import { logWarn } from "./logger";

// ============================================================================
// ASSET PRESERVATION RULES — prepended to EVERY product prompt.
// ============================================================================
// Why this is so forceful: gpt-image-1 by default "interprets" the input image.
// It redraws logos, stylises brand marks, alters faces, recomposes photos, and
// generally treats the input as a creative starting point. For a print-on-
// demand product this is a complete dealbreaker — customers expect their
// photo / logo printed EXACTLY as submitted. Treat the design as immutable.
//
// IMPORTANT — this prompt-only approach is a best-effort guardrail. The model
// will still occasionally drift. The only way to GUARANTEE pixel-perfect
// preservation is a deterministic compositor (overlay PNG on a pre-rendered
// blank product photo, no AI in the loop). That is tracked as a follow-up.
const ASSET_PRESERVATION_RULES = `ABSOLUTE RULE — read carefully and obey on every output:

The provided image is a CUSTOMER ASSET — a logo, brand mark, photograph, artwork, or design — submitted for direct print on a physical product. You MUST treat it as an immutable, unalterable raster. The customer expects the print to look IDENTICAL to what they uploaded.

YOU MUST NOT:
- redraw, redesign, reinterpret, restyle, illustrate, or recreate the design
- modify any colours, gradients, lines, shapes, edges, characters, letters, words, numbers, faces, eyes, mouths, expressions, skin tones, hair, clothing, backgrounds, textures, or composition WITHIN the design
- crop, mask, mirror, rotate, or replace any part of the design
- add any element (text, watermark, decoration, signature, frame) to the design
- remove any element from the design
- "improve", "stylise", "embroider", "render in fabric thread", "render in stitches", or otherwise interpret the design — apply it as a flat printed graphic only
- alter faces, photographs, brand marks, or text in ANY way — these are sacred and must be reproduced pixel-for-pixel from the source

THE ONLY TRANSFORMATIONS PERMITTED ARE:
- proportional scaling of the WHOLE design to fit the print area
- realistic perspective consistent with the product surface (e.g. flat for a t-shirt face, cylindrical projection for a mug body, gentle curvature for a cap front panel)
- a thin natural fabric / material texture overlay so the print looks physically applied to the product surface

If you cannot apply the design without altering its content, return a clean product mockup WITHOUT the design rather than a modified version of the design.

`;

// Per-product mockup prompts. Each starts with ASSET_PRESERVATION_RULES, then
// describes the product and the placement rules. Product descriptions are kept
// neutral so the model doesn't take liberties with garment colour or angle.
const PRODUCT_PROMPTS: Record<string, string> = {
  tshirt: `${ASSET_PRESERVATION_RULES}PRODUCT: heather grey cotton t-shirt, laid flat on a soft neutral background. Soft natural studio lighting, premium product photography style, fabric texture and stitching visible.

PRINT PLACEMENT: place the entire design on the chest area at a natural graphic size, centred horizontally, top edge approximately four inches below the collar. The design itself must remain unchanged — only fabric-weave overlay and natural drape perspective are allowed.`,

  hoodie: `${ASSET_PRESERVATION_RULES}PRODUCT: black pullover hoodie with kangaroo pocket and drawstrings, laid flat on a soft neutral background. Studio lighting, premium product photography style, fleece texture visible.

PRINT PLACEMENT: place the entire design on the chest area, centred horizontally above the kangaroo pocket. The design itself must remain unchanged — only fabric texture overlay and natural drape are allowed.`,

  mug: `${ASSET_PRESERVATION_RULES}PRODUCT: white ceramic 11oz coffee mug with handle on the right, sitting on a wooden surface, viewed from the front. Soft natural lighting, premium product photography style, ceramic glaze visible.

PRINT PLACEMENT: apply the entire design to the visible front face of the mug body, centred. The design itself must remain unchanged — the ONLY additional transformation permitted is the cylindrical surface projection required to wrap a flat image around a cylinder. Scale the design DOWN if necessary so the entire design remains visible on the curved surface; never crop it.`,

  tote: `${ASSET_PRESERVATION_RULES}PRODUCT: natural canvas tote bag with two leather handles, standing upright against a soft neutral background. Studio lighting, premium product photography style, canvas weave visible.

PRINT PLACEMENT: place the entire design centred on the front panel of the tote at a natural graphic size. The design itself must remain unchanged — only canvas-weave texture overlay is allowed.`,

  towel: `${ASSET_PRESERVATION_RULES}PRODUCT: folded beach towel resting on light sand, viewed from above-front. Bright natural daylight, premium product photography style, soft microfiber texture visible.

PRINT PLACEMENT: place the entire design centred on the visible folded top section of the towel. The design itself must remain unchanged — only soft microfiber texture overlay is allowed.`,

  cap: `${ASSET_PRESERVATION_RULES}PRODUCT: black structured 6-panel baseball cap with a curved brim, viewed from the front. Studio lighting, premium product photography style, fabric weave and stitching visible.

PRINT PLACEMENT: apply the entire design as a FLAT PRINTED GRAPHIC on the front centre panel of the cap, at a natural size for cap branding. DO NOT render the design as embroidery, stitching, or thread — treat it as a heat-transfer or sublimation print. The design itself must remain unchanged — the ONLY additional transformation permitted is the gentle curve of the cap front panel.`,
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
      { timeout: 60_000 }
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
