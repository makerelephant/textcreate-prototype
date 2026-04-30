import type { CollectionItem, ImageAnalysis } from "@/types";

export const MOCK_ITEMS: CollectionItem[] = [
  { id: "i1", title: "Minimal White Sneakers", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800", description: "Clean silhouette and everyday styling.", category: "footwear", color_tags: ["white"], style_tags: ["minimal", "casual"], material_tags: ["leather"], confidence_score: 0 },
  { id: "i2", title: "Black Leather Jacket", image: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=800", description: "Structured outerwear with bold mood.", category: "outerwear", color_tags: ["black"], style_tags: ["streetwear", "edgy"], material_tags: ["leather"], confidence_score: 0 },
  { id: "i3", title: "Beige Linen Shirt", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", description: "Relaxed texture and warm neutral tones.", category: "tops", color_tags: ["beige"], style_tags: ["relaxed", "minimal"], material_tags: ["linen"], confidence_score: 0 }
];

export function buildCollectionItems(analysis: ImageAnalysis): CollectionItem[] {
  const tokens = new Set([analysis.product_category, ...analysis.colors, ...analysis.style, ...analysis.materials, ...analysis.keywords, ...analysis.recommended_item_tags].map((x) => x.toLowerCase()));
  return MOCK_ITEMS.map((item) => {
    const bag = [item.category, ...item.color_tags, ...item.style_tags, ...item.material_tags].map((x) => x.toLowerCase());
    const score = bag.filter((t) => tokens.has(t)).length / Math.max(1, bag.length);
    return { ...item, confidence_score: Number(score.toFixed(2)) };
  }).sort((a, b) => b.confidence_score - a.confidence_score);
}
