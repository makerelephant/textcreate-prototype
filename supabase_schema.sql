-- Run in the Supabase SQL editor. Idempotent.

-- Storage bucket (public read; service-role writes from server only).
insert into storage.buckets (id, name, public)
values ('textcreate-media', 'textcreate-media', true)
on conflict (id) do nothing;

-- Sessions: one row per inbound MMS / demo run.
create table if not exists collection_sessions (
  id uuid primary key default gen_random_uuid(),
  from_phone text not null,
  message_sid text unique,
  source_twilio_media_url text,
  source_image_url text not null,
  analysis_json jsonb not null,
  collection_items_json jsonb not null,
  collection_url text not null default '',
  generated_hero_image_url text,
  generated_image_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists collection_sessions_from_phone_created_at_idx
  on collection_sessions (from_phone, created_at desc);
create index if not exists collection_sessions_message_sid_idx
  on collection_sessions (message_sid);

-- Brand assets: short string IDs (e.g. "a-logo") so the seed data and code align.
create table if not exists brand_assets (
  id text primary key,
  asset_type text not null,
  item_id text,
  label text not null,
  stored_url text not null,
  created_at timestamptz not null default now()
);

-- Generated images: hero + future variants.
create table if not exists generated_images (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references collection_sessions(id) on delete cascade,
  kind text not null,
  model text not null,
  prompt text not null,
  source_image_urls jsonb not null,
  asset_ids jsonb not null,
  openai_response_json jsonb not null,
  output_image_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists generated_images_session_id_idx
  on generated_images (session_id);

-- Idempotency lock for Twilio webhook retries. UNIQUE message_sid is the lock.
create table if not exists processed_messages (
  message_sid text primary key,
  session_id uuid references collection_sessions(id) on delete cascade,
  collection_url text not null,
  created_at timestamptz not null default now()
);

-- Seed brand assets.
insert into brand_assets (id, asset_type, item_id, label, stored_url) values
  ('seed-logo',     'logo',          null, 'Demo logo',         'https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=800'),
  ('seed-life',     'lifestyle',     null, 'Demo lifestyle',    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800'),
  ('seed-i1',       'product_photo', 'i1', 'Sneaker seed',      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800'),
  ('seed-i2',       'product_photo', 'i2', 'Jacket seed',       'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'),
  ('seed-i3',       'packaging',     'i3', 'Packaging seed',    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800')
on conflict (id) do nothing;
