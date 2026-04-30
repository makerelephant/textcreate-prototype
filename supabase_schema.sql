create table collection_sessions (
  id uuid primary key,
  from_phone text not null,
  source_twilio_media_url text,
  source_image_url text not null,
  analysis_json jsonb not null,
  collection_items_json jsonb not null,
  collection_url text not null,
  generated_hero_image_url text,
  generated_image_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table brand_assets (
  id uuid primary key,
  asset_type text not null,
  item_id text,
  label text not null,
  stored_url text not null,
  created_at timestamptz not null default now()
);

create table generated_images (
  id uuid primary key,
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
