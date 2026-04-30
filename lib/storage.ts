import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { appBaseUrl } from "./config";

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function storeImage(buffer: Buffer, contentType: string, prefix: string) {
  // Vercel serverless functions cannot write to /var/task/public at runtime.
  // For prototype/demo mode, return a data URL so the collection can still render.
  // Production should replace this with durable object storage such as Vercel Blob, S3, or R2.
  if (isVercelRuntime()) {
    const safeContentType = contentType || "image/jpeg";
    return `data:${safeContentType};base64,${buffer.toString("base64")}`;
  }

  const ext = contentType.includes("png") ? "png" : "jpg";
  const name = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buffer);
    return `${appBaseUrl()}/uploads/${name}`;
  } catch {
    // Local fallback if public directory is unavailable.
    const tmpDir = path.join(os.tmpdir(), "textcreate-uploads");
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, name), buffer);
    return `data:${contentType || "image/jpeg"};base64,${buffer.toString("base64")}`;
  }
}
