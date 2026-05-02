# Changelog — 2026-04-30

Handoff document for the next agent. Captures everything done today, the current state of the system, and known open issues.

---

## Context for the next agent

- **User:** Mark Slater (`ms@elephdigital.com`). Works in **production only** — does not use terminal commands. Walk through web UIs (Vercel dashboard, Supabase dashboard, Twilio console, Wix DNS) click-by-click.
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
- WhatsApp Sandbox webhook has been configured and is working,

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
| `DISABLE_TWILIO_SIGNATURE_VALIDATION` | `true` | TEMPORARY — set to unblock testing after the webhook returned 403. Re-enable signature validation (set to `false` or remove) before any non-test traffic. |

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

### 1. SMS path is blocked at the carrier level (long-standing)
- Twilio number `+1 989 864 2911` returned error **30034: "US A2P 10DLC - Message from an Unregistered Number"** when attempting to deliver an outbound message. The collection link IS generated correctly server-side (visible in Twilio Body field) — carriers just block delivery.
- Even TwiML auto-replies are blocked from unregistered US long codes.
- **Fix paths:** A2P 10DLC registration (1-3 weeks), toll-free number + verification (2-4 weeks), WhatsApp Sandbox (immediate, in progress), graduate to paid WhatsApp Business sender (1-2 days).
- No action required. User is waiting on approval of campaigns before migrating from whatsapp to the numbers.

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

1. **Fix the OpenAI analysis fallback bug** — print the actual error from the log warns. It's almost certainly a `text.format` shape issue with the structured outputs API.
2. **Iterate on mockup prompts** — once you have a few real test results, the prompts in `lib/mockup-gen.ts` will tell you which products need tweaking. T-shirt and hoodie tend to work best with `gpt-image-1`; mug and beach towel need more guidance about how the design wraps.
3. **PII hashing** before any external user testing (TCPA exposure).
4. **Don't suggest gpt-image-2** unless you've verified it exists in the OpenAI catalog as of your knowledge cutoff. Today's user explicitly asked for it; OpenAI's docs as of Jan 2026 only listed `gpt-image-1`. The model is env-driven (`OPENAI_IMAGE_MODEL`) so swapping is one env-var change, no code.

---

## Additional work since the first changelog entry

### Reliability + race fixes
- **Postgres `set_mockup` RPC** — atomic jsonb_set replaces the read-modify-write
  pattern that was losing mockups when multiple finished in parallel. Eliminated
  the "different tiles after each refresh" symptom. ([f66b731](https://github.com/makerelephant/textcreate-prototype/commit/f66b731))
- **Dropped the `images.generate` fallback** in `lib/mockup-gen.ts`. The fallback
  produced generic product photos without the user's design, and its 75 s timeout
  inside the 90 s function envelope was the cause of "tile spins forever" — the
  function would get killed mid-fallback. ([f66b731](https://github.com/makerelephant/textcreate-prototype/commit/f66b731))
- **Reduced OpenAI timeout to 60 s** so it always returns inside Vercel's 90 s window.
- **Client-side 100 s AbortController** so dead requests give up cleanly.
- **Stale-effect cancellation bug** — the *real* root cause of "two tiles stuck
  generating until hard refresh". The trigger effect's `cancelled` closure was tied
  to effect lifetime, not component lifetime, so the cleanup that fired on every
  `mockups` update (because `mockups` was in the dep array) silently discarded the
  in-flight responses for the 2nd and 3rd parallel mockups. Fixed by switching to
  a component-lifetime `unmountedRef`. ([3979fa6](https://github.com/makerelephant/textcreate-prototype/commit/3979fa6))
- **Polling endpoint** `GET /api/sessions/[id]/mockups` returns the current mockup
  map; client polls every 5 s while any tile is still generating. Acts as a safety
  net for any genuinely-lost responses. ([8de584f](https://github.com/makerelephant/textcreate-prototype/commit/8de584f))

### Speed
- **`quality: "low"`** on `gpt-image-1` calls — drops mockup latency from
  15-25 s (medium) to 8-15 s. Image fidelity reduces noticeably but the demo is
  usable for the first time. Toggleable via `OPENAI_IMAGE_MODEL` / future quality env.
  ([3979fa6](https://github.com/makerelephant/textcreate-prototype/commit/3979fa6))
- **Initial batch = 3** with on-demand "Spin up 3 more…" button reveals the
  remaining 3 (now total 6: tshirt, hoodie, mug, tote, towel, cap). Cuts initial
  page load to 3 OpenAI calls. ([7da4472](https://github.com/makerelephant/textcreate-prototype/commit/7da4472))

### UI / design system
- Title "Your Collection is Ready ✌️👇🏻" + subtitle "Our recommendations pair your
  asset…" ([8de584f](https://github.com/makerelephant/textcreate-prototype/commit/8de584f), capitalised in [0bfa33c](https://github.com/makerelephant/textcreate-prototype/commit/0bfa33c))
- **Header restructured** to a single left-aligned column: H1, subtitle, then a
  small "Share Your Collection" chip-button below. (Previous layout had the share
  button right-aligned in the header — moved per design ref.)
- **Share button** uses native `navigator.share()` with clipboard fallback. Sized
  to design system: Geist 14 px / 500, 6 × 18 px padding, 8 px radius, 14 px icon. ([520ae68](https://github.com/makerelephant/textcreate-prototype/commit/520ae68), [f3e1962](https://github.com/makerelephant/textcreate-prototype/commit/f3e1962))
- **Source-design card moved** to BELOW the products grid + Spin up button, hugs
  its content rather than stretching full width (`width: fit-content`-style via
  `inline-flex`/`align-self`), 8 × 12 px padding. Removed the "YOUR DESIGN"
  redundant label. Chip text changed to "View Your Design".
- **"Learn more about our product scoring model →"** placeholder link below the
  source card. Geist 14 px / 600 (sized down from the screenshot to match the
  design system per follow-up). ([916ea01](https://github.com/makerelephant/textcreate-prototype/commit/916ea01))
- **"Products" h2 above the grid removed** ([916ea01](https://github.com/makerelephant/textcreate-prototype/commit/916ea01)).
- **Live ETA countdown** in generating tiles: starts at ~25 s, ticks down each
  second, switches to "Finishing…" near zero, then "Almost there…" if it overruns.
  Replaces the static "~30 sec" label. ([8de584f](https://github.com/makerelephant/textcreate-prototype/commit/8de584f))

### Branding + assets
- **Header logo** replaced from the engine-mark icon with the
  `Made in Motion Create.png` wordmark. 300 px wide on desktop / 160 px on mobile.
  ([aa3a7fc](https://github.com/makerelephant/textcreate-prototype/commit/aa3a7fc), [5a1790b](https://github.com/makerelephant/textcreate-prototype/commit/5a1790b))
- **Favicon** wired up via Next.js's `metadata.icons` (sources `public/favicon.png`).
  Browsers cache aggressively — hard refresh to see updates. ([879e76e](https://github.com/makerelephant/textcreate-prototype/commit/879e76e))
- **Loosh mascot** (`public/loosh-worming copy.webm`) added behind the first
  product tile. Wrapped tile structure (`.cp-tile-anchor`) so the mascot sits at
  z-index 0 and the sibling tile at z-index 1 — the tile's white background cleanly
  hides the bottom half of the mascot. (Previously placed inside the tile with
  `z-index: -1`, which didn't work because the tile's entry animation creates its
  own stacking context.)
- **Mascot hidden on mobile** (`@media (max-width: 720px) { .cp-mascot { display: none } }`)
  because iOS Safari does not support WebM with alpha channel — the video matte renders
  as opaque black on iOS. Proper fix is providing a HEVC alpha `.mov` source as a
  second `<source>` element; punted to a follow-up.

### Custom domain
- `create.madeinmotionapp.com` added at Wix (CNAME `create` → `cname.vercel-dns.com`)
  and assigned to the Vercel project. `NEXT_PUBLIC_APP_URL` env var updated. New
  collection links produced from this point onward use the custom domain. Old
  `.vercel.app` URLs still work because Vercel keeps both alive.

### Twilio diagnosis
- Confirmed: `+1 989 864 2911` (US long code) is **blocked at the carrier layer
  by US A2P 10DLC error 30034** for unregistered numbers. Pipeline correctly
  generates the collection link and queues the TwiML reply — carriers (T-Mobile /
  AT&T / Verizon) reject the outbound at network level regardless of how the
  message was generated. **No code change can fix this** — A2P 10DLC registration
  is the only path. (1-3 weeks process.)
- Identified: signature validation was returning **403 Forbidden** to all Twilio
  webhook calls. User worked around by setting `DISABLE_TWILIO_SIGNATURE_VALIDATION=true`
  to unblock testing. Root cause not yet fixed — most likely the `TWILIO_AUTH_TOKEN`
  in Vercel doesn't match the account, or there's a body-encoding mismatch. To
  debug: log the computed validation URL alongside the failure, compare to what
  Twilio actually called. **Re-enable signature validation before production.**
- **WhatsApp Sandbox** confirmed working (replies with collection link in ~10 s).
  Same `/api/twilio/inbound` endpoint handles both SMS and WhatsApp because Twilio
  normalises the inbound webhook payload.

---

## For tomorrow — top items

1. **Tighten the per-product image prompts** in `lib/mockup-gen.ts`. Today's prompts
   produce wildly inconsistent results — sometimes the mascot/logo gets warped,
   recoloured, or replaced by something the model invents. Important constraints
   that need to be added/strengthened:
   - **Never alter the user's submitted asset** — preserve colours, proportions,
     orientation, and any text/logo exactly. The asset should be applied AS A PRINT,
     not "interpreted".
   - Tighten product descriptions so the model doesn't take liberties with the base
     product (e.g. it sometimes invents a different garment colour or angle).
   - Consider negative prompts ("do not modify the design", "do not add text",
     "do not crop the design").
2. **Fix the OpenAI vision analysis fallback** that's returning canned data on every
   request (see "Open issues" → #4 above). The likely culprit is the `text.format`
   shape for structured outputs being slightly wrong for the SDK version.
4. **Re-enable Twilio signature validation** by debugging the 403. Auth token
   re-copy + a logging tweak that prints the URL and computed signature. **Do this
   before any non-test traffic.**
5. **PII** — hash `from_phone` (sha256 + salt) before storage; mask in logs.
   Schema migration to add `from_phone_hash` column.

---

## Day 2 (2026-05-01) — UI cleanup before image-prompt work

### Layout restructure
- **Brand mark moved out of absolute positioning** into the content flow as
  `cp-content`'s first child. Spacing to the title is now governed by a clean
  `margin-bottom: 24 px` instead of fragile padding-top math against the logo's
  variable height. Same effect on mobile.
- **Mobile logo bumped from 160 px → 240 px wide** per the design.
- **`cp-content` padding reduced** from `132 56 24` to `36 56 36` (and `24 24 24`
  on mobile) since the brand no longer needs dedicated reserved space at the top.
- **`cp-content` flex gap reduced** from 32 px to 24 px so the major content
  blocks (brand → header → products section → footer group) sit at the same
  rhythm.

### New "products section" structure
- Wrapped the user-asset tile, products grid, and Spin-up row in a single
  `cp-products-section` flex column with a 12 px gap. This lets us put the
  user asset tile **12 px above the first product tile** while keeping the
  24 px gap between the products section and the surrounding blocks.
- **New `.cp-user-asset` mint tile** — 80 × 80 px, `#EDFFF9` background,
  `#D6F1E3` border, holds the user's submitted design fitted with `object-fit:
  contain`. Left-justified to the first product tile. No label text (per design).
- **Removed the old `.cp-source-row` card** (the "View Your Design" white card
  that previously sat below the products grid). The tile above the grid replaces
  it.

### Footer group
- New `cp-footer-group` wraps the "Learn more about our product scoring model"
  link and the "© 2026 Made In Motion PBC" copyright with a 24 px vertical gap
  between them. Footer is no longer absolute-positioned at the bottom of the
  viewport — it sits at the natural end of the content flow with a 24 px
  margin-top above the group.

### Copy + button updates
- **Subtitle** changed to *"Our system pairs your asset with visually compatible
  products while optimizing for the highest production quality."*
- **Spin-up button** label changed to *"Show Me More Product Ideas"* (no longer
  shows the dynamic remaining count) and now includes the `Refresh white.png`
  icon from `public/` after the label. New `cp-btn-icon` class sets it to 16 px.

### Env vars
- Added `DISABLE_TWILIO_SIGNATURE_VALIDATION=true` to the documented env vars
  table — temporary unblock for the webhook 403, must be removed before
  production traffic.

---

## Final commit list

- [01e48c8](https://github.com/makerelephant/textcreate-prototype/commit/01e48c8) — Wire Supabase, sync pipeline, add structured outputs + Zod validation
- [6276ab9](https://github.com/makerelephant/textcreate-prototype/commit/6276ab9) — Add product mockup pipeline, In Motion design, mobile responsive
- [a7c43aa](https://github.com/makerelephant/textcreate-prototype/commit/a7c43aa) — Update collection page header copy
- [7da4472](https://github.com/makerelephant/textcreate-prototype/commit/7da4472) — Show 3 mockups + Spin up more, ETA, See your design chip
- [f3e1962](https://github.com/makerelephant/textcreate-prototype/commit/f3e1962) — Promote share CTA to prominent full-width button
- [520ae68](https://github.com/makerelephant/textcreate-prototype/commit/520ae68) — Resize share button to design system, ship medium quality mockups
- [0bfa33c](https://github.com/makerelephant/textcreate-prototype/commit/0bfa33c) — Capitalize H in collection page title
- [f66b731](https://github.com/makerelephant/textcreate-prototype/commit/f66b731) — Fix mockup race + drop generate fallback + client abort + changelog
- [8de584f](https://github.com/makerelephant/textcreate-prototype/commit/8de584f) — Polling, dynamic ETA, layout reorder, copy + button updates
- [f730d03](https://github.com/makerelephant/textcreate-prototype/commit/f730d03) — Add Loosh mascot peeking from behind first product tile
- [3979fa6](https://github.com/makerelephant/textcreate-prototype/commit/3979fa6) — Fix stale-effect cancellation discarding mockup responses + low quality
- [aa3a7fc](https://github.com/makerelephant/textcreate-prototype/commit/aa3a7fc) — Replace header logo with Made in Motion Create wordmark
- [5a1790b](https://github.com/makerelephant/textcreate-prototype/commit/5a1790b) — Bump header logo: 300 px desktop / 160 px mobile
- [879e76e](https://github.com/makerelephant/textcreate-prototype/commit/879e76e) — Wire favicon.png from public folder via metadata.icons
- [0e99e04](https://github.com/makerelephant/textcreate-prototype/commit/0e99e04) — Mascot at 50% size, behind tile background (incomplete — fixed in next)
- [916ea01](https://github.com/makerelephant/textcreate-prototype/commit/916ea01) — Resize learn-more link to design system, drop Products subhead
- [8ec0fbd](https://github.com/makerelephant/textcreate-prototype/commit/8ec0fbd) — Header column layout, hug source-row, hide mascot on mobile, mascot wrapper for proper z-index
