import OpenAI from "openai";
import { logWarn } from "./logger";

// Per-product mockup prompts. The user's design is passed as the input image
// to images.edit, and the prompt instructs the model to compose it onto the product.
const PRODUCT_PROMPTS: Record<string, string> = {
  tshirt:
    "Photorealistic product mockup of a heather gray cotton t-shirt laid flat on a soft neutral background, with the provided design printed centered on the chest area. Soft natural studio lighting, premium product photography style, fabric texture and stitching detail visible.",
  hoodie:
    "Photorealistic product mockup of a black pullover hoodie laid flat on a soft neutral background, with the provided design printed across the chest. Studio lighting, premium product photography style, fleece texture visible, kangaroo pocket and drawstrings detail.",
  mug:
    "Photorealistic product mockup of a white ceramic 11oz coffee mug on a wooden surface, with the provided design wrapped around the visible front of the mug body. Soft natural lighting, premium product photography style, ceramic glaze and handle detail.",
  tote:
    "Photorealistic product mockup of a natural canvas tote bag standing upright against a soft neutral background, with the provided design printed centered on the front panel. Studio lighting, premium product photography, canvas weave and reinforced handle detail visible.",
  towel:
    "Photorealistic product mockup of a folded beach towel resting on light sand, with the provided design printed across the visible folded section. Bright natural daylight, premium product photography style, soft microfiber texture visible.",
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

  // Primary path: edit the user's design into a product mockup.
  const userFile = await urlToFile(userImageUrl);
  if (userFile) {
    try {
      const edited = await client.images.edit(
        { model, prompt, image: userFile, size: "1024x1024" },
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
    } catch (e) {
      logWarn("mockup_edit_failed", { productId, reason: e instanceof Error ? e.message : "unknown" });
    }
  }

  // Fallback: prompt-only generation. Won't include the user's exact design,
  // but at least returns a representative product image.
  try {
    const generated = await client.images.generate(
      { model, prompt, size: "1024x1024" },
      { timeout: 75_000 }
    );
    const b64 = generated?.data?.[0]?.b64_json;
    return {
      productId,
      outputBuffer: b64 ? Buffer.from(b64, "base64") : null,
      outputMimeType: "image/png",
      prompt,
      meta: { used: "images.generate_fallback" },
    };
  } catch (e) {
    logWarn("mockup_generate_failed", { productId, reason: e instanceof Error ? e.message : "unknown" });
    return {
      productId,
      outputBuffer: null,
      outputMimeType: "image/png",
      prompt,
      meta: { error: e instanceof Error ? e.message : "unknown" },
    };
  }
}
