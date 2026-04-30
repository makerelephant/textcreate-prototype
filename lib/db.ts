import crypto from "node:crypto";
import type { BrandAsset, CollectionSession, GeneratedImageRecord, ImageAnalysis, CollectionItem } from "@/types";
import { supabase } from "./supabase";

type SessionRow = {
  id: string;
  from_phone: string;
  message_sid: string | null;
  source_twilio_media_url: string | null;
  source_image_url: string;
  analysis_json: ImageAnalysis;
  collection_items_json: CollectionItem[];
  collection_url: string;
  generated_hero_image_url: string | null;
  generated_image_ids: string[];
  mockups_json: Record<string, string> | null;
  created_at: string;
};

function rowToSession(r: SessionRow): CollectionSession {
  return {
    id: r.id,
    from_phone: r.from_phone,
    message_sid: r.message_sid,
    source_twilio_media_url: r.source_twilio_media_url,
    source_image_url: r.source_image_url,
    analysis: r.analysis_json,
    collection_items: r.collection_items_json,
    collection_url: r.collection_url,
    generated_hero_image_url: r.generated_hero_image_url,
    generated_image_ids: r.generated_image_ids ?? [],
    mockups: r.mockups_json ?? {},
    created_at: r.created_at,
  };
}

export async function createSession(
  session: Omit<CollectionSession, "id" | "created_at" | "generated_hero_image_url" | "generated_image_ids" | "mockups">
): Promise<CollectionSession> {
  const insert = {
    id: crypto.randomUUID(),
    from_phone: session.from_phone,
    message_sid: session.message_sid ?? null,
    source_twilio_media_url: session.source_twilio_media_url,
    source_image_url: session.source_image_url,
    analysis_json: session.analysis,
    collection_items_json: session.collection_items,
    collection_url: session.collection_url || "",
  };
  const { data, error } = await supabase()
    .from("collection_sessions")
    .insert(insert)
    .select()
    .single();
  if (error) throw new Error(`create_session_failed: ${error.message}`);
  return rowToSession(data as SessionRow);
}

export async function updateSession(id: string, patch: Partial<CollectionSession>): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.collection_url !== undefined) dbPatch.collection_url = patch.collection_url;
  if (patch.generated_hero_image_url !== undefined) dbPatch.generated_hero_image_url = patch.generated_hero_image_url;
  if (patch.generated_image_ids !== undefined) dbPatch.generated_image_ids = patch.generated_image_ids;
  if (patch.analysis !== undefined) dbPatch.analysis_json = patch.analysis;
  if (patch.collection_items !== undefined) dbPatch.collection_items_json = patch.collection_items;
  if (patch.mockups !== undefined) dbPatch.mockups_json = patch.mockups;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase().from("collection_sessions").update(dbPatch).eq("id", id);
  if (error) throw new Error(`update_session_failed: ${error.message}`);
}

export async function getSession(id: string): Promise<CollectionSession | null> {
  const { data, error } = await supabase()
    .from("collection_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`get_session_failed: ${error.message}`);
  if (!data) return null;
  return rowToSession(data as SessionRow);
}

export async function listRecentSessions(limit = 20): Promise<CollectionSession[]> {
  const { data, error } = await supabase()
    .from("collection_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`list_sessions_failed: ${error.message}`);
  return (data as SessionRow[]).map(rowToSession);
}

export async function addGeneratedImage(
  row: Omit<GeneratedImageRecord, "id" | "created_at">
): Promise<GeneratedImageRecord> {
  const insert = {
    id: crypto.randomUUID(),
    session_id: row.session_id,
    kind: row.kind,
    model: row.model,
    prompt: row.prompt,
    source_image_urls: row.source_image_urls,
    asset_ids: row.asset_ids,
    openai_response_json: row.openai_response_json,
    output_image_url: row.output_image_url,
  };
  const { data, error } = await supabase()
    .from("generated_images")
    .insert(insert)
    .select()
    .single();
  if (error) throw new Error(`add_generated_image_failed: ${error.message}`);
  return data as GeneratedImageRecord;
}

export async function getBrandAssets(): Promise<BrandAsset[]> {
  const { data, error } = await supabase().from("brand_assets").select("*");
  if (error) throw new Error(`get_brand_assets_failed: ${error.message}`);
  return (data ?? []).map((r: { id: string; asset_type: BrandAsset["asset_type"]; item_id: string | null; label: string; stored_url: string }) => ({
    id: r.id,
    asset_type: r.asset_type,
    item_id: r.item_id,
    label: r.label,
    stored_url: r.stored_url,
  }));
}

export async function setBrandAssets(assets: BrandAsset[]): Promise<void> {
  if (assets.length === 0) return;
  const rows = assets.map((a) => ({
    id: a.id,
    asset_type: a.asset_type,
    item_id: a.item_id,
    label: a.label,
    stored_url: a.stored_url,
  }));
  const { error } = await supabase()
    .from("brand_assets")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`set_brand_assets_failed: ${error.message}`);
}

export async function getProcessedMessage(messageSid: string) {
  const { data, error } = await supabase()
    .from("processed_messages")
    .select("*")
    .eq("message_sid", messageSid)
    .maybeSingle();
  if (error) throw new Error(`get_processed_message_failed: ${error.message}`);
  if (!data) return null;
  return { messageSid: data.message_sid, collectionUrl: data.collection_url, sessionId: data.session_id };
}

export async function setProcessedMessage(messageSid: string, collectionUrl: string, sessionId: string) {
  const { error } = await supabase()
    .from("processed_messages")
    .upsert(
      { message_sid: messageSid, collection_url: collectionUrl, session_id: sessionId },
      { onConflict: "message_sid", ignoreDuplicates: true }
    );
  if (error) throw new Error(`set_processed_message_failed: ${error.message}`);
}
