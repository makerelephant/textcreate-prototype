import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import type { BrandAsset, CollectionSession, GeneratedImageRecord } from "@/types";

type Store = {
  sessions: CollectionSession[];
  generatedImages: GeneratedImageRecord[];
  brandAssets: BrandAsset[];
  processedMessages: { messageSid: string; collectionUrl: string; sessionId: string }[];
};

function dbFile() {
  // Vercel's /var/task is read-only at runtime. Use /tmp for prototype/demo persistence.
  // This is not durable and may reset across cold starts, but it works for a live demo on a warm instance.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "textcreate-local-db.json");
  }
  return path.join(process.cwd(), "data", "local-db.json");
}

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await fs.readFile(dbFile(), "utf8"));
    return {
      sessions: parsed.sessions || [],
      generatedImages: parsed.generatedImages || [],
      brandAssets: parsed.brandAssets || [],
      processedMessages: parsed.processedMessages || [],
    };
  } catch {
    return { sessions: [], generatedImages: [], brandAssets: [], processedMessages: [] };
  }
}

async function writeStore(store: Store) {
  const file = dbFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2));
}

export async function createSession(session: Omit<CollectionSession, "id" | "created_at" | "generated_hero_image_url" | "generated_image_ids">): Promise<CollectionSession> {
  const store = await readStore();
  const row: CollectionSession = { ...session, id: crypto.randomUUID(), created_at: new Date().toISOString(), generated_hero_image_url: null, generated_image_ids: [] };
  store.sessions.push(row);
  await writeStore(store);
  return row;
}

export async function updateSession(id: string, patch: Partial<CollectionSession>) {
  const store = await readStore();
  store.sessions = store.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
  await writeStore(store);
}

export async function getSession(id: string): Promise<CollectionSession | null> {
  const store = await readStore();
  return store.sessions.find((s) => s.id === id) || null;
}

export async function addGeneratedImage(row: Omit<GeneratedImageRecord, "id" | "created_at">): Promise<GeneratedImageRecord> {
  const store = await readStore();
  const record: GeneratedImageRecord = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  store.generatedImages.push(record);
  await writeStore(store);
  return record;
}

export async function getBrandAssets(): Promise<BrandAsset[]> {
  const store = await readStore();
  return store.brandAssets;
}

export async function setBrandAssets(assets: BrandAsset[]) {
  const store = await readStore();
  store.brandAssets = assets;
  await writeStore(store);
}

export async function getProcessedMessage(messageSid: string) {
  const store = await readStore();
  return store.processedMessages.find((m) => m.messageSid === messageSid) || null;
}

export async function setProcessedMessage(messageSid: string, collectionUrl: string, sessionId: string) {
  const store = await readStore();
  if (!store.processedMessages.find((m) => m.messageSid === messageSid)) {
    store.processedMessages.push({ messageSid, collectionUrl, sessionId });
    await writeStore(store);
  }
}

export async function listRecentSessions(limit = 20) {
  const store = await readStore();
  return [...store.sessions].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, limit);
}
