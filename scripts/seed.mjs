// Seeds brand_assets into Supabase. Idempotent (upsert by id).
// Run with: node --env-file=.env.local scripts/seed.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const assets = [
  { id: "seed-logo", asset_type: "logo",          item_id: null, label: "Demo logo",      stored_url: "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=800" },
  { id: "seed-life", asset_type: "lifestyle",     item_id: null, label: "Demo lifestyle", stored_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800" },
  { id: "seed-i1",   asset_type: "product_photo", item_id: "i1", label: "Sneaker seed",   stored_url: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800" },
  { id: "seed-i2",   asset_type: "product_photo", item_id: "i2", label: "Jacket seed",    stored_url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800" },
  { id: "seed-i3",   asset_type: "packaging",     item_id: "i3", label: "Packaging seed", stored_url: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800" },
];

const { error } = await supabase.from("brand_assets").upsert(assets, { onConflict: "id" });
if (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
}
console.log(`Seeded ${assets.length} brand assets into Supabase.`);
