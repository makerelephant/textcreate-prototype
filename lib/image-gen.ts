import OpenAI from "openai";
import type { BrandAsset, CollectionItem, VisualDirection } from "@/types";
import { logWarn } from "./logger";

export type HeroGenerationResult = {
  model: string;
  prompt: string;
  sourceImageUrls: string[];
  assetIds: string[];
  outputBuffer: Buffer | null;
  outputMimeType: string;
  meta: Record<string, unknown>;
};

function promptForCollection(visual: VisualDirection, items: CollectionItem[]) {
  return `Create one square hero image for a style collection prototype. Use the provided source image as reference. Keep branding faithful. Do not invent unavailable items. Keep item appearance accurate. Mood: ${visual.mood.join(", ")}. Style: ${visual.style.join(", ")}. Palette: ${visual.color_palette.join(", ")}. Featured items: ${items.slice(0, 3).map((i) => i.title).join(", ")}.`;
}

async function urlToFile(url: string): Promise<File | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      logWarn("hero_source_fetch_failed", { url, status: res.status });
      return null;
    }
    const ab = await res.arrayBuffer();
    return new File([ab], "source.png", { type: res.headers.get("content-type") || "image/png" });
  } catch (e) {
    logWarn("hero_source_fetch_exception", { url, reason: e instanceof Error ? e.message : "unknown" });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateHeroImage(params: {
  userImageUrl: string;
  items: CollectionItem[];
  assets: BrandAsset[];
  visual: VisualDirection;
}): Promise<HeroGenerationResult> {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const sourceImageUrls = [params.userImageUrl, ...params.assets.slice(0, 4).map((a) => a.stored_url)];
  const prompt = promptForCollection(params.visual, params.items);
  const assetIds = params.assets.map((a) => a.id);

  if (!process.env.OPENAI_API_KEY || process.env.ENABLE_IMAGE_GENERATION === "false") {
    return {
      model, prompt, sourceImageUrls, assetIds,
      outputBuffer: null, outputMimeType: "image/png",
      meta: { fallback: true, reason: "disabled_or_missing_key" },
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Try edit using only the user image — gpt-image-1 single-image edit is the most reliable path.
  const userFile = await urlToFile(params.userImageUrl);
  if (userFile) {
    try {
      const edited = await client.images.edit(
        { model, prompt, image: userFile, size: "1024x1024" },
        { timeout: 50_000 }
      );
      const b64 = edited?.data?.[0]?.b64_json;
      if (b64) {
        return {
          model, prompt, sourceImageUrls, assetIds,
          outputBuffer: Buffer.from(b64, "base64"),
          outputMimeType: "image/png",
          meta: { used: "images.edit" },
        };
      }
      logWarn("image_edit_no_b64", {});
    } catch (e) {
      logWarn("image_edit_failed", { reason: e instanceof Error ? e.message : "unknown" });
    }
  }

  // Fallback: prompt-only generation.
  try {
    const generated = await client.images.generate(
      { model, prompt, size: "1024x1024" },
      { timeout: 50_000 }
    );
    const b64 = generated?.data?.[0]?.b64_json;
    return {
      model, prompt, sourceImageUrls, assetIds,
      outputBuffer: b64 ? Buffer.from(b64, "base64") : null,
      outputMimeType: "image/png",
      meta: { used: "images.generate_fallback" },
    };
  } catch (e) {
    logWarn("image_generate_failed", { reason: e instanceof Error ? e.message : "unknown" });
    return {
      model, prompt, sourceImageUrls, assetIds,
      outputBuffer: null, outputMimeType: "image/png",
      meta: { error: e instanceof Error ? e.message : "unknown" },
    };
  }
}
