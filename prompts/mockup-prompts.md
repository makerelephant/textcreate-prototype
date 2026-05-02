# Mockup generation prompts

These are the exact prompts sent to `gpt-image-1` (`images.edit`) to generate each product mockup. The user's submitted asset is passed as the input image.

> **Note:** This file is for **review only**. The source of truth is [`lib/mockup-gen.ts`](../lib/mockup-gen.ts). Any change you mark up here needs to be applied to `mockup-gen.ts` and re-deployed to take effect.

> **Caveat on guarantees:** even with these strict prompts, `gpt-image-1` may still occasionally drift from the user's asset. The only way to **guarantee** pixel-perfect preservation is a deterministic compositor (overlay PNG on a pre-rendered blank product photo, no AI). That's tracked as a follow-up.

> **History note (2026-05-01):** A previous, much longer / more verbose version of these rules caused most products to fail to render entirely (only the t-shirt would generate). `gpt-image-1`'s `images.edit` appears to hit a reliability cliff with long prompts. Kept intentionally tight as a result.

---

## Shared header — applied to every product prompt

This block is prepended to every product-specific prompt below.

```
ASSET RULE: the provided image is the customer's asset (logo, photo, artwork) for direct print. Reproduce it EXACTLY — do NOT redraw, restyle, recolour, recrop, mirror, rotate, or alter any element. Do NOT add or remove content. Do NOT render text or shapes as embroidery, stitches, or thread — flat print only. Faces, text, and brand marks must be pixel-for-pixel from the source. ONLY transformations permitted: proportional scaling, realistic surface perspective for the product, light material texture overlay.
```

---

## Per-product prompts

Each prompt below is the **product-specific section** that follows the shared header.

### 🎽 T-Shirt (`tshirt`)

```
Apply the design centred on the chest of a heather grey cotton t-shirt laid flat on a soft neutral background. Premium product photography, soft studio lighting, fabric texture and stitching visible.
```

### 🧥 Pullover Hoodie (`hoodie`)

```
Apply the design centred on the chest of a black pullover hoodie with kangaroo pocket and drawstrings, laid flat on a soft neutral background. Premium product photography, studio lighting, fleece texture visible.
```

### ☕ Coffee Mug (`mug`)

```
Apply the design to the visible front of a white ceramic 11oz coffee mug with right-side handle, on a wooden surface. The mug's cylindrical curve is the only additional transform — scale the design down to fit the visible curved surface without cropping. Premium product photography, soft natural lighting, ceramic glaze visible.
```

### 👜 Tote Bag (`tote`)

```
Apply the design centred on the front panel of a natural canvas tote bag with leather handles, standing upright against a soft neutral background. Premium product photography, studio lighting, canvas weave visible.
```

### 🏖 Beach Towel (`towel`)

```
Apply the design centred on the visible folded section of a folded beach towel resting on light sand, viewed from above-front. Premium product photography, bright natural daylight, microfiber texture visible.
```

### 🧢 Baseball Cap (`cap`)

```
Apply the design as a FLAT print (NOT embroidery, NOT thread) on the front centre panel of a black structured 6-panel baseball cap with curved brim, viewed from the front. The cap's gentle front-panel curve is the only additional transform. Premium product photography, studio lighting, fabric weave visible.
```

---

## How to suggest a change

The fastest review loop:

1. Edit this MD with your suggested wording (or comment inline).
2. Tell me which product(s) you changed and what you want.
3. I'll apply the changes to `lib/mockup-gen.ts`, push, and you can test on the deployed site.

---

## Things to watch for in real outputs

When you test mockups, look out for any of these — they're signs the prompt isn't holding:

- **Logo redrawn** — different fonts, different colours, different proportions vs your upload. Most common failure mode.
- **Faces altered** — different expression, different skin tone, different hair, eyes / mouth subtly off. A dealbreaker for personal photos.
- **Text changed** — letterforms re-rendered, words misspelled, characters added or removed.
- **Embroidery / thread effect on the cap** — we explicitly forbid this; if it appears, the prompt isn't holding for that product.
- **Design cropped** — particularly on the mug (cylindrical wrap) or cap (curved panel). The prompt says to scale down rather than crop.
- **Random elements added** — watermarks, frames, "designed by" text, decorative borders.
- **Colour shifts** — saturated colours faded, white backgrounds turned grey, etc.
- **Product fails to render entirely** — likely the prompt is too long; tighten further or shorten.
