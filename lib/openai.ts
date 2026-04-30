import OpenAI from "openai";
import type { ImageAnalysis } from "@/types";

function fallback(): ImageAnalysis { return { product_category:"footwear", colors:["white","black"], style:["minimal","casual"], materials:["leather"], keywords:["clean lines","modern"], shopping_intent:"build a visual style collection", recommended_item_tags:["minimal","footwear"], visual_direction:{ style:["clean ecommerce","studio-lit"], color_palette:["white","black","neutral"], object_product_type:"footwear", mood:["modern","premium"], materials:["leather"], scene_context:["soft gradient background"] } }; }

export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  if (!process.env.OPENAI_API_KEY) return fallback();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [{ role: "user", content: [{ type: "input_text", text: "Return strict JSON for fashion visual collection analysis with fields: product_category, colors, style, materials, keywords, shopping_intent, recommended_item_tags, visual_direction{style,color_palette,object_product_type,mood,materials,scene_context}." }, { type: "input_image", image_url: imageUrl, detail: "low" }] }],
    temperature: 0.2,
  } as any);
  try { return JSON.parse(resp.output_text || "{}"); } catch { throw new Error("json_parse_failed"); }
}
