import { z } from "zod";

export const VisualDirectionSchema = z.object({
  style: z.array(z.string()),
  color_palette: z.array(z.string()),
  object_product_type: z.string(),
  mood: z.array(z.string()),
  materials: z.array(z.string()),
  scene_context: z.array(z.string()),
});

export const ImageAnalysisSchema = z.object({
  product_category: z.string(),
  colors: z.array(z.string()),
  style: z.array(z.string()),
  materials: z.array(z.string()),
  keywords: z.array(z.string()),
  shopping_intent: z.string(),
  recommended_item_tags: z.array(z.string()),
  visual_direction: VisualDirectionSchema,
});

// JSON Schema variant for OpenAI structured outputs.
// Strict mode requires every property listed in `required` and additionalProperties:false at every level.
export const IMAGE_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "product_category",
    "colors",
    "style",
    "materials",
    "keywords",
    "shopping_intent",
    "recommended_item_tags",
    "visual_direction",
  ],
  properties: {
    product_category: { type: "string" },
    colors: { type: "array", items: { type: "string" } },
    style: { type: "array", items: { type: "string" } },
    materials: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    shopping_intent: { type: "string" },
    recommended_item_tags: { type: "array", items: { type: "string" } },
    visual_direction: {
      type: "object",
      additionalProperties: false,
      required: [
        "style",
        "color_palette",
        "object_product_type",
        "mood",
        "materials",
        "scene_context",
      ],
      properties: {
        style: { type: "array", items: { type: "string" } },
        color_palette: { type: "array", items: { type: "string" } },
        object_product_type: { type: "string" },
        mood: { type: "array", items: { type: "string" } },
        materials: { type: "array", items: { type: "string" } },
        scene_context: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;
