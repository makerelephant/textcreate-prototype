import OpenAI from "openai";
import type { BrandAsset, CollectionItem, VisualDirection } from "@/types";

export type HeroGenerationResult = { model:string; prompt:string; sourceImageUrls:string[]; assetIds:string[]; outputBuffer:Buffer|null; outputMimeType:string; meta:Record<string, unknown> };

function promptForCollection(visual: VisualDirection, items: CollectionItem[]) { return `Create one square hero image for a style collection prototype. Use provided source images as references. Keep branding faithful. Do not invent unavailable items. Keep item appearance accurate. Mood: ${visual.mood.join(", ")}. Style: ${visual.style.join(", ")}. Palette: ${visual.color_palette.join(", ")}. Featured items: ${items.slice(0,3).map(i=>i.title).join(", ")}.`; }

async function urlsToFiles(urls: string[]) {
  const files: File[] = [];
  for (const u of urls) {
    const res = await fetch(u);
    if (!res.ok) continue;
    const ab = await res.arrayBuffer();
    files.push(new File([ab], `source-${files.length}.png`, { type: res.headers.get("content-type") || "image/png" }));
  }
  return files;
}

export async function generateHeroImage(params: { userImageUrl: string; items: CollectionItem[]; assets: BrandAsset[]; visual: VisualDirection; }): Promise<HeroGenerationResult> {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const sourceImageUrls = [params.userImageUrl, ...params.assets.slice(0, 4).map((a) => a.stored_url)];
  const prompt = promptForCollection(params.visual, params.items);
  if (!process.env.OPENAI_API_KEY || process.env.ENABLE_IMAGE_GENERATION === "false") return { model,prompt,sourceImageUrls,assetIds:params.assets.map(a=>a.id),outputBuffer:null,outputMimeType:"image/png",meta:{fallback:true,reason:"disabled_or_missing_key"} };
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const files = await urlsToFiles(sourceImageUrls);
    if (files.length > 0) {
      const edited: any = await client.images.edit({ model, prompt, image: files as any, size: "1024x1024" } as any);
      const b64 = edited?.data?.[0]?.b64_json;
      if (b64) return { model,prompt,sourceImageUrls,assetIds:params.assets.map(a=>a.id),outputBuffer:Buffer.from(b64,"base64"),outputMimeType:"image/png",meta:{used:"images.edit",count:files.length} };
    }
  } catch {
    // continue to prompt-only
  }
  const generated: any = await client.images.generate({ model, prompt, size: "1024x1024" });
  const b64 = generated?.data?.[0]?.b64_json;
  return { model,prompt,sourceImageUrls,assetIds:params.assets.map(a=>a.id),outputBuffer:b64?Buffer.from(b64,"base64"):null,outputMimeType:"image/png",meta:{used:"images.generate_fallback"} };
}
