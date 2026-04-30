import crypto from "node:crypto";
import { BUCKET, supabase } from "./supabase";

export async function storeImage(buffer: Buffer, contentType: string, prefix: string): Promise<string> {
  const safeContentType = contentType || "image/jpeg";
  const ext = safeContentType.includes("png") ? "png" : "jpg";
  const key = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase().storage.from(BUCKET).upload(key, buffer, {
    contentType: safeContentType,
    upsert: false,
  });
  if (error) throw new Error(`storage_upload_failed: ${error.message}`);
  const { data } = supabase().storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
