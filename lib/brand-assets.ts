import type { BrandAsset, CollectionItem } from "@/types";
import { getBrandAssets } from "./db";

const SEEDED_ASSETS: BrandAsset[] = [
  { id: "a-logo", asset_type: "logo", item_id: null, label: "Primary logo", stored_url: "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=800" },
  { id: "a-life", asset_type: "lifestyle", item_id: null, label: "Lifestyle scene", stored_url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800" },
  { id: "a-i1", asset_type: "product_photo", item_id: "i1", label: "Sneaker studio", stored_url: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800" },
  { id: "a-i2", asset_type: "product_photo", item_id: "i2", label: "Jacket studio", stored_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800" },
  { id: "a-i3", asset_type: "packaging", item_id: "i3", label: "Neutral packaging", stored_url: "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=800" }
];

export async function selectBrandAssets(items: CollectionItem[]): Promise<BrandAsset[]> {
  const ids = new Set(items.map((x) => x.id));
  const fromStore = await getBrandAssets();
  const source = fromStore.length ? fromStore : SEEDED_ASSETS;
  return source.filter((a) => a.asset_type === "logo" || a.asset_type === "lifestyle" || (a.item_id && ids.has(a.item_id))).slice(0, 8);
}

export { SEEDED_ASSETS };
