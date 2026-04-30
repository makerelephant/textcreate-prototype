import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { appBaseUrl } from "./config";

export async function storeImage(buffer: Buffer, contentType: string, prefix: string) {
  const ext = contentType.includes("png") ? "png" : "jpg";
  const name = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return `${appBaseUrl()}/uploads/${name}`;
}
