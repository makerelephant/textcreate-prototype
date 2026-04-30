import OpenAI from "openai";
import type { ImageAnalysis } from "@/types";
import { IMAGE_ANALYSIS_JSON_SCHEMA, ImageAnalysisSchema } from "./schemas";
import { logWarn } from "./logger";

const FALLBACK: ImageAnalysis = {
  product_category: "footwear",
  colors: ["white", "black"],
  style: ["minimal", "casual"],
  materials: ["leather"],
  keywords: ["clean lines", "modern"],
  shopping_intent: "build a visual style collection",
  recommended_item_tags: ["minimal", "footwear"],
  visual_direction: {
    style: ["clean ecommerce", "studio-lit"],
    color_palette: ["white", "black", "neutral"],
    object_product_type: "footwear",
    mood: ["modern", "premium"],
    materials: ["leather"],
    scene_context: ["soft gradient background"],
  },
};

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    logWarn("openai_analyze_fallback", { reason: "missing_api_key" });
    return FALLBACK;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let raw = "";
  try {
    const resp = await client.responses.create(
      {
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Analyze this image for fashion visual collection generation. Return JSON matching the provided schema.",
              },
              { type: "input_image", image_url: imageUrl, detail: "low" },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "image_analysis",
            schema: IMAGE_ANALYSIS_JSON_SCHEMA,
            strict: true,
          },
        },
        temperature: 0.2,
      } as Parameters<typeof client.responses.create>[0],
      { timeout: 25_000 }
    );
    raw = (resp as { output_text?: string }).output_text || "";
  } catch (e) {
    logWarn("openai_analyze_request_failed", {
      reason: e instanceof Error ? e.message : "unknown",
    });
    return FALLBACK;
  }

  if (!raw.trim()) {
    logWarn("openai_analyze_empty_response", {});
    return FALLBACK;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (e) {
    logWarn("openai_analyze_json_parse_failed", {
      reason: e instanceof Error ? e.message : "unknown",
      preview: raw.slice(0, 200),
    });
    return FALLBACK;
  }

  const result = ImageAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    logWarn("openai_analyze_schema_invalid", { issues: result.error.issues.slice(0, 5) });
    return FALLBACK;
  }
  return result.data;
}
