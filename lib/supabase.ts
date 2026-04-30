import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "textcreate-media";

export function supabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
