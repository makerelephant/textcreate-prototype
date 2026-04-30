export type VisualDirection = {
  style: string[];
  color_palette: string[];
  object_product_type: string;
  mood: string[];
  materials: string[];
  scene_context: string[];
};

export type ImageAnalysis = {
  product_category: string;
  colors: string[];
  style: string[];
  materials: string[];
  keywords: string[];
  shopping_intent: string;
  recommended_item_tags: string[];
  visual_direction: VisualDirection;
};

export type CollectionItem = {
  id: string;
  title: string;
  image: string;
  description: string;
  category: string;
  color_tags: string[];
  style_tags: string[];
  material_tags: string[];
  confidence_score: number;
};

export type BrandAsset = {
  id: string;
  asset_type: "product_photo" | "logo" | "packaging" | "lifestyle" | "brand_guideline";
  item_id: string | null;
  label: string;
  stored_url: string;
};

export type GeneratedImageRecord = {
  id: string;
  session_id: string;
  kind: "collection_hero";
  model: string;
  prompt: string;
  source_image_urls: string[];
  asset_ids: string[];
  openai_response_json: Record<string, unknown>;
  output_image_url: string;
  created_at: string;
};

export type CollectionSession = {
  id: string;
  from_phone: string;
  source_twilio_media_url: string | null;
  message_sid?: string | null;
  source_image_url: string;
  analysis: ImageAnalysis;
  collection_items: CollectionItem[];
  collection_url: string;
  generated_hero_image_url: string | null;
  generated_image_ids: string[];
  created_at: string;
};
