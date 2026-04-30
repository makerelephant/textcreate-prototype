# Changelog — 2026-04-30

Handoff document for the next agent. Captures everything done today, the current state of the system, and known open issues.

---

## Context for the next agent

- **User:** Mark Slater (`ms@elephdigital.com`). Works in **production only** — does not use terminal commands. Walk through web UIs (Vercel dashboard, Supabase dashboard, Twilio console, Wix DNS) click-by-click.
- **Demo pressure:** the user had a team demo this morning. Today's work was urgent and pragmatic — ship usable end-to-end behavior, not perfect code.
- **Repo:** [github.com/makerelephant/textcreate-prototype](https://github.com/makerelephant/textcreate-prototype) (`main` branch auto-deploys to Vercel; user has had to manually **Promote to Production** in Vercel because some redeploys land as Preview)
- **Vercel project:** `textcreate-prototype` (account: mark-slaters-projects-f5bed7db)
- **Custom domain:** `create.madeinmotionapp.com` — DNS at Wix (CNAME to `cname.vercel-dns.com`). Working as of last check.
- **Old Vercel domain:** `textcreate-prototype.vercel.app` — still active alongside the custom one.
- **Sister app:** `inmotion.madeinmotionapp.com` is a separate live app (the MiM platform), not part of this repo. Don't touch.
- **Brand:** "In Motion" / "MiM" (Made In Motion PBC). Logo + engine motif assets live in `/public/assets/`.

---

## Starting state (this morning)

The original prototype (described in `prototype_debug_report.md`) was end-to-end broken:
- JSON-file persistence on Vercel `/tmp` (per-instance, ephemeral).
- Storage fell back to base64 data URLs on serverless.
- Twilio webhook used `Promise.resolve().then(...)` to "background-process" — Vercel kills the function the instant the response returns, so the background work never ran.
- Outbound REST `client.messages.create` blocked by US carrier A2P 10DLC compliance (number `+1 989 864 2911` is an unregistered US long code).
- Mock collection items were hardcoded Unsplash photos; user's image was used as creative direction only, not composed onto products.
- Visual analysis from OpenAI returned identical fallback values for every image (silent failure).
- No design system applied; bare-bones HTML.

---

## What was shipped today (in order)

### Phase 1 — Supabase wiring ([commit 01e48c8](https://github.com/makerelephant/textcreate-prototype/commit/01e48c8))
- Added `@supabase/supabase-js`. New `lib/supabase.ts` (lazy service-role client).
- Replaced `lib/storage.ts` to upload to Supabase Storage; killed the data-URL/`/tmp` paths entirely.
- Replaced `lib/db.ts` with Supabase Postgres CRUD; preserved the same exported function signatures so callers didn't change.
- Updated `supabase_schema.sql` (idempotent): bucket creation, `processed_messages` table, indexes, `message_sid` column, brand-asset seed rows.
- Added env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`. `lib/env.ts` health check covers them.
- `scripts/seed.mjs` rewritten to upsert via Supabase.

### Phase 2 — Synchronous webhook + TwiML reply (same commit)
- Killed the broken `Promise.resolve().then(...)` background pattern in the Twilio inbound route.
- Pipeline now runs synchronously and returns the collection URL **inside the TwiML reply**. No second outbound REST send → sidesteps Twilio's REST-side outbound review.
- Hero generation deferred to `POST /api/sessions/[sessionId]/hero`, triggered client-side from the collection page after first paint.
- Extracted `lib/pipeline.ts` (`createSessionFromImageUrl`, `generateHeroForSession`) so Twilio + dev/mock-inbound share one path.
- Removed `lib/send-sms.ts` and the `DEMO_MODE_NO_OUTBOUND_SMS` branch. Removed `data/local-db.json`.

### Phase 3 — Hardening (same commit)
- Added `zod`. New `lib/schemas.ts` with `ImageAnalysisSchema` + a hand-written JSON Schema for OpenAI structured outputs.
- `lib/openai.ts` now uses `responses.create` with `text.format = { type: "json_schema", strict: true, ... }` so the model must return valid JSON. Also fence-strips and Zod-validates as belt-and-braces.
- `AbortController` timeouts: 15s on Twilio media download, 10s on hero source fetch, 25s on OpenAI analysis, 50s on hero gen.
- Image-edit failures in `lib/image-gen.ts` now log clearly instead of silent `catch {}`. Switched to single-image edit (more reliable for `gpt-image-1`).

### Phase 4 — Product mockup pipeline ([commit 6276ab9](https://github.com/makerelephant/textcreate-prototype/commit/6276ab9))
- Replaced `MOCK_ITEMS` with 5 customizable products: T-Shirt, Hoodie, Coffee Mug, Tote Bag, Beach Towel. Sixth product (Baseball Cap) added in [commit 7da4472](https://github.com/makerelephant/textcreate-prototype/commit/7da4472).
- New `lib/mockup-gen.ts`: per-product `gpt-image-1 images.edit` calls compose the user's design onto each product blank using product-specific prompts (one prompt per product ID).
- New endpoint `POST /api/sessions/[sessionId]/mockups/[productId]` generates and stores one mockup at a time.
- New column `mockups_json jsonb default '{}'::jsonb` on `collection_sessions` (manual schema migration required — see "Migrations" below).
- `generated_images` table now also stores `kind="product_mockup"` rows.
- Collection page fans out parallel mockup requests on first load; each tile flips from "Generating" → "Ready" as URLs return.

### Phase 5 — In Motion design + mobile responsive (same commit)
- Copied `handoff/public/assets/{engine-background.png, logo-mark.png}` to `public/assets/` so they ship with the build.
- New `app/collections/[sessionId]/collections.css` under `.cp-*` namespace (page-scoped, no global collisions).
- Design tokens: `#EEF1F4` canvas, `#289BFF` accent, `#1E252A` heading, `#3E4C60` body, 12px card radii, hairline borders, soft shadows.
- Geist font loaded via `next/font/google` in `app/layout.tsx`.
- Layout: brand mark top-left, animated breathing "engine" motif background (faded for populated state), hero source-image card, products grid, footer.
- Mobile breakpoint at 720px: tighter padding, scaled brand mark, narrower grid columns.
- Spinner + animations respect `prefers-reduced-motion`.

### UX iterations
- Header copy ([commit a7c43aa](https://github.com/makerelephant/textcreate-prototype/commit/a7c43aa)): title `here is your collection 👉🏻`, subtitle "Here are a collection of product mockups containing the asset that you sent to MiM." — capitalized to `Here is...` in [commit 0bfa33c](https://github.com/makerelephant/textcreate-prototype/commit/0bfa33c).
- Batched mockups ([commit 7da4472](https://github.com/makerelephant/textcreate-prototype/commit/7da4472)): show 3 initially, "Spin up 3 more…" button reveals + generates the next 3. Cuts initial load + cost.
- Generating tiles now show ETA "~30 sec" alongside the spinner.
- Replaced long share URL with a `See your design` chip button that opens the source image in a new tab.
- Share CTA ([commit f3e1962](https://github.com/makerelephant/textcreate-prototype/commit/f3e1962)) wired native `navigator.share()` with clipboard fallback. Resized to design system spec ([commit 520ae68](https://github.com/makerelephant/textcreate-prototype/commit/520ae68)): Geist 14px / 500, padding 6×18, 8px radius, 14px icon, lives in the header.
- Mockup speed ([commit 520ae68](https://github.com/makerelephant/textcreate-prototype/commit/520ae68)): added `quality: "medium"` to both `images.edit` and `images.generate` calls. Drops per-mockup latency from ~30-60s to ~15-25s.

### Custom domain
- User added `create.madeinmotionapp.com` at Wix (CNAME `create` → `cname.vercel-dns.com`) and assigned it to the project in Vercel.
- `NEXT_PUBLIC_APP_URL` env var updated to `https://create.madeinmotionapp.com`. Confirmed working — `/api/health` returns `status: "ok"` on the new domain.

---

## Current state of the deployed system

- Health endpoint: `https://create.madeinmotionapp.com/api/health` → `status: "ok"`, no warnings.
- Pipeline confirmed working end-to-end via `/demo` page — session created in Supabase, source image uploaded to Storage, mockups generated and persisted.
- New design rendering correctly with brand mark, motif, tiles, mobile responsive.
- Hero generation endpoint exists but is no longer auto-triggered by the collection page (mockup grid replaced it visually).
- WhatsApp Sandbox webhook has been configured by the user but **is not responding with a collection link as of the time of writing** — see Open Issues below.

---

## Environment variables (Vercel — production)

| Key | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | (their Supabase project URL) | Set |
| `SUPABASE_SERVICE_ROLE_KEY` | (their service_role key) | Set, server-only |
| `SUPABASE_STORAGE_BUCKET` | `textcreate-media` | Set |
| `OPENAI_API_KEY` | sk-... | Set |
| `OPENAI_IMAGE_MODEL` | (empty) | Falls back to `gpt-image-1` in code |
| `ENABLE_IMAGE_GENERATION` | `true` | Set |
| `NEXT_PUBLIC_APP_URL` | `https://create.madeinmotionapp.com` | Updated to custom domain |
| `TWILIO_ACCOUNT_SID` | AC... | Set |
| `TWILIO_AUTH_TOKEN` | (their token) | Set |
| `TWILIO_PHONE_NUMBER` | `+19898642911` | US long code, NOT A2P-registered |
| `PUBLIC_WEBHOOK_BASE_URL` | (unset — falls back to `NEXT_PUBLIC_APP_URL`) | Important for signature validation |

**Note:** the user previously set `OPENAI_IMAGE_MODEL=image 2` (with a space, invalid value) trying to use a hypothetical "gpt-image-2". That broke all mockups until the value was cleared. If you see mockups failing across the board, check this env var first.

---

## Migrations required

The Supabase schema now has these tables/columns. The full schema is in `supabase_schema.sql` (idempotent — safe to re-run). Most recent additions the user manually ran in Supabase SQL editor:

- `collection_sessions.mockups_json jsonb default '{}'::jsonb` — added today
- `processed_messages` table — added in Phase 1
- `collection_sessions.message_sid text unique` — added in Phase 1

If a column appears missing in production after a code change, ask the user to re-run `supabase_schema.sql` in their Supabase SQL Editor (it uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`, so it's safe).

---

## Open issues

### 1. WhatsApp Sandbox not delivering collection link (active)
- Configured webhook URL: should be `https://create.madeinmotionapp.com/api/twilio/inbound` (POST). Verify in **Twilio Console → Messaging → Try it out → Send a WhatsApp message → Sandbox settings**.
- User has joined the sandbox at least once.
- **Diagnosis pending.** Most likely causes:
  - Webhook URL still points to the old `.vercel.app` domain → signature validation fails (3-403) because `PUBLIC_WEBHOOK_BASE_URL` is unset and falls back to `NEXT_PUBLIC_APP_URL = https://create.madeinmotionapp.com`. Twilio computes signature against the URL it actually called; if those mismatch → silent 403.
  - User sent SMS instead of WhatsApp message (sandbox number ignores SMS).
  - User sent text-only (no media) → our route returns "Send a photo and I'll turn it into a visual collection." which would be delivered.
- **Next step:** ask user for **Twilio Console → Monitor → Logs → Messaging Logs** entry from the failed attempt. The Request Inspector shows the exact URL Twilio called, the response code, and the body we returned. That tells you whether (a) we 403'd, (b) we 200'd with TwiML, or (c) we never got the call.

### 2. SMS path is blocked at the carrier level (long-standing)
- Twilio number `+1 989 864 2911` returned error **30034: "US A2P 10DLC - Message from an Unregistered Number"** when attempting to deliver an outbound message. The collection link IS generated correctly server-side (visible in Twilio Body field) — carriers just block delivery.
- Even TwiML auto-replies are blocked from unregistered US long codes.
- **Fix paths:** A2P 10DLC registration (1-3 weeks), toll-free number + verification (2-4 weeks), WhatsApp Sandbox (immediate, in progress), graduate to paid WhatsApp Business sender (1-2 days).

### 3. Mockup composition quality varies
- `gpt-image-1` `images.edit` does its best to composite the user's design onto each product, but quality is inconsistent — placement can be off, design can be warped, sometimes the design vanishes entirely and you get a generic product photo.
- One prompt per product in `lib/mockup-gen.ts` (`PRODUCT_PROMPTS`). Iterate there.
- Falls back to `images.generate` (prompt-only) if `images.edit` fails — that fallback never includes the user's design at all, just a representative product photo.

### 4. OpenAI vision analysis silently returns fallback
- `analyzeImage` in `lib/openai.ts` falls back to a hardcoded `FALLBACK` constant on any error (missing API key, request failure, schema validation failure, JSON parse failure, empty response).
- Test result earlier today showed the fallback was being returned for a clearly-not-footwear image — meaning the `responses.create` call with structured outputs was failing.
- The collection items are now hardcoded mockup products anyway, so the analysis output isn't currently used for anything except being displayed in tags. Still worth fixing for future when analysis drives prompts.
- Likely cause: the `text.format = { type: "json_schema", ... }` shape might be slightly wrong for the SDK version. Worth printing the actual error from the warn log — see Vercel function logs.

### 5. PII / compliance
- `from_phone` stored in plaintext in `collection_sessions`. Logs also include unmasked phone numbers in `lib/twilio.ts` route.
- For real user testing, hash phone (sha256 + salt) before storage and mask in logs. Schema migration required (`from_phone_hash` column).

### 6. Hero endpoint is dead code (mostly)
- `POST /api/sessions/[sessionId]/hero` and `lib/pipeline.ts:generateHeroForSession` still exist, but the new collection-view UI no longer triggers it. Safe to remove if you're cleaning up; harmless if left in.

---

## Useful endpoints + URLs

- Production health: `https://create.madeinmotionapp.com/api/health`
- Demo (no Twilio needed): `https://create.madeinmotionapp.com/demo`
- Mock inbound (full pipeline test from a known image URL): `POST https://create.madeinmotionapp.com/api/dev/mock-inbound?imageUrl=<url>&withHero=false`
- Recent sessions (dev only): `https://create.madeinmotionapp.com/api/dev/sessions` (returns 404 in production unless `DEMO_MODE_NO_OUTBOUND_SMS=true` — that env var is no longer used by anything else)
- Twilio inbound webhook: `https://create.madeinmotionapp.com/api/twilio/inbound`
- Per-product mockup generation: `POST https://create.madeinmotionapp.com/api/sessions/<id>/mockups/<productId>`

---

## File map (the bits that matter)

| File | Purpose |
|---|---|
| `app/api/twilio/inbound/route.ts` | Inbound MMS/WhatsApp webhook. Synchronous, returns TwiML with URL. |
| `app/api/sessions/[sessionId]/mockups/[productId]/route.ts` | On-demand per-product mockup generation. |
| `app/api/sessions/[sessionId]/hero/route.ts` | Legacy hero endpoint. Not used by current UI. |
| `app/api/dev/mock-inbound/route.ts` | Dev-only test trigger that runs the pipeline against any image URL. |
| `app/api/health/route.ts` | Env + status report. Use this for first-line diagnosis. |
| `app/collections/[sessionId]/page.tsx` | Server component that loads the session and renders `CollectionView`. |
| `app/collections/[sessionId]/collections.css` | Page-scoped CSS using `.cp-*` namespace. |
| `components/collection-view.tsx` | The full client UI for a collection — share button, source card, product tiles, batch reveal. |
| `lib/pipeline.ts` | `createSessionFromImageUrl`, `generateHeroForSession`, `generateMockupForSession`. The shared pipeline used by every entrypoint. |
| `lib/mockup-gen.ts` | Per-product OpenAI image-edit calls + product-specific prompts. |
| `lib/image-gen.ts` | Hero image generation (legacy, still works). |
| `lib/openai.ts` | Vision analysis (`responses.create` + Zod). |
| `lib/db.ts` | Supabase CRUD. |
| `lib/storage.ts` | Supabase Storage upload. |
| `lib/supabase.ts` | Lazy service-role client. |
| `lib/twilio.ts` | Signature validation + media download. |
| `lib/product-matching.ts` | The 6-product `MOCKUP_PRODUCTS` list. |
| `lib/schemas.ts` | Zod + JSON schemas. |
| `supabase_schema.sql` | Source of truth for the database. Idempotent. |

---

## What I'd do next (if I were the next agent)

1. **Diagnose WhatsApp** — get the user to paste a screenshot of Twilio Messaging Logs from a failed attempt. That's the fastest way to see whether the webhook fired at all.
2. **Fix the OpenAI analysis fallback bug** — print the actual error from the log warns. It's almost certainly a `text.format` shape issue with the structured outputs API.
3. **Iterate on mockup prompts** — once you have a few real test results, the prompts in `lib/mockup-gen.ts` will tell you which products need tweaking. T-shirt and hoodie tend to work best with `gpt-image-1`; mug and beach towel need more guidance about how the design wraps.
4. **PII hashing** before any external user testing (TCPA exposure).
5. **Don't suggest gpt-image-2** unless you've verified it exists in the OpenAI catalog as of your knowledge cutoff. Today's user explicitly asked for it; OpenAI's docs as of Jan 2026 only listed `gpt-image-1`. The model is env-driven (`OPENAI_IMAGE_MODEL`) so swapping is one env-var change, no code.

---

## Final commit list

- [01e48c8](https://github.com/makerelephant/textcreate-prototype/commit/01e48c8) — Wire Supabase, sync pipeline, add structured outputs + Zod validation
- [6276ab9](https://github.com/makerelephant/textcreate-prototype/commit/6276ab9) — Add product mockup pipeline, In Motion design, mobile responsive
- [a7c43aa](https://github.com/makerelephant/textcreate-prototype/commit/a7c43aa) — Update collection page header copy
- [7da4472](https://github.com/makerelephant/textcreate-prototype/commit/7da4472) — Show 3 mockups + Spin up more, ETA, See your design chip
- [f3e1962](https://github.com/makerelephant/textcreate-prototype/commit/f3e1962) — Promote share CTA to prominent full-width button
- [520ae68](https://github.com/makerelephant/textcreate-prototype/commit/520ae68) — Resize share button to design system, ship medium quality mockups
- [0bfa33c](https://github.com/makerelephant/textcreate-prototype/commit/0bfa33c) — Capitalize H in collection page title
