# Prototype Debug Report — Twilio → Image → Collection Flow

## Objective

Build a working prototype where:

1. User sends an image via SMS (Twilio MMS)
2. Image is processed (OpenAI vision + GPT image)
3. A collection is generated using that image
4. A link is returned to the user

---

## Current Status

**❌ End-to-end flow is NOT working**

### What works
- Twilio receives inbound MMS
- Webhook hits Vercel
- Image download begins

### What fails
- Image storage
- OpenAI processing
- Session persistence
- Background execution
- Outbound SMS (carrier block)

---

## Root Causes

### 1. Serverless limitations (Vercel)
- No writable filesystem
- No durable storage
- Background jobs get killed

### 2. No public image URL
- OpenAI requires a public URL
- Base64 and local paths fail

### 3. Twilio compliance blocking outbound
- A2P / Toll-free verification blocks replies

### 4. Async processing model incompatible
- Background promises do not complete in serverless

---

## Diagnosis

This is an architecture mismatch:
A stateful, multi-step media pipeline is running in a stateless environment without storage.

---

## Required Fixes

### 1. Add durable storage
Use:
- Vercel Blob (preferred)
- or S3 / R2

### 2. Remove filesystem usage
No:
- /public
- /tmp
- JSON files

### 3. Make pipeline synchronous
Process request fully before responding.

### 4. Decouple Twilio
Test system without SMS dependency.

### 5. Fix demo approach
Demo must use real pipeline, not mock data.

---

## Minimal Working Architecture

Twilio MMS  
→ Webhook  
→ Download image  
→ Upload to Blob (public URL)  
→ OpenAI analysis  
→ Build collection  
→ Return URL  

---

## What NOT to do

- Do not fake collections
- Do not use local storage
- Do not rely on async background jobs
- Do not debug Twilio further

---

## Bottom Line

The system is failing due to:
**Serverless limitations + lack of persistent storage**

---

## Fastest Path Forward

1. Add Blob storage
2. Upload images there
3. Use URL for OpenAI
4. Run synchronously
5. Return collection link in response
