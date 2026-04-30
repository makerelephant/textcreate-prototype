import fs from 'node:fs/promises';
import path from 'node:path';

const DB_FILE = path.join(process.cwd(), 'data', 'local-db.json');
const assets = [
  { id: 'seed-logo', asset_type: 'logo', item_id: null, label: 'Demo logo', stored_url: 'https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=800' },
  { id: 'seed-life', asset_type: 'lifestyle', item_id: null, label: 'Demo lifestyle', stored_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800' },
  { id: 'seed-i1', asset_type: 'product_photo', item_id: 'i1', label: 'Sneaker seed', stored_url: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800' },
  { id: 'seed-i2', asset_type: 'product_photo', item_id: 'i2', label: 'Jacket seed', stored_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800' },
  { id: 'seed-i3', asset_type: 'packaging', item_id: 'i3', label: 'Packaging seed', stored_url: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800' }
];

let store = { sessions: [], generatedImages: [], brandAssets: [] };
try { store = JSON.parse(await fs.readFile(DB_FILE, 'utf8')); } catch {}
store.brandAssets = assets;
await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
await fs.writeFile(DB_FILE, JSON.stringify(store, null, 2));
console.log(`Seeded ${assets.length} brand assets into ${DB_FILE}`);
