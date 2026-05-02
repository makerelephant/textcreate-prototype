# Mockup generation prompts

These are the exact prompts sent to `gpt-image-1` (`images.edit`) to generate each product mockup. The user's submitted asset is passed as the input image.

> **Note:** This file is for **review only**. The source of truth is [`lib/mockup-gen.ts`](../lib/mockup-gen.ts). Any change you mark up here needs to be applied to `mockup-gen.ts` and re-deployed to take effect.

> **Caveat on guarantees:** even with these strict prompts, `gpt-image-1` may still occasionally drift from the user's asset. The only way to **guarantee** pixel-perfect preservation is a deterministic compositor (overlay PNG on a pre-rendered blank product photo, no AI). That's tracked as a follow-up.

---

## Shared header — applied to every product prompt

This block is prepended to every product-specific prompt below.

```
ABSOLUTE RULE — read carefully and obey on every output:

The provided image is a CUSTOMER ASSET — a logo, brand mark, photograph, artwork, or design — submitted for direct print on a physical product. You MUST treat it as an immutable, unalterable raster. The customer expects the print to look IDENTICAL to what they uploaded.

YOU MUST NOT:
- redraw, redesign, reinterpret, restyle, illustrate, or recreate the design
- modify any colours, gradients, lines, shapes, edges, characters, letters, words, numbers, faces, eyes, mouths, expressions, skin tones, hair, clothing, backgrounds, textures, or composition WITHIN the design
- crop, mask, mirror, rotate, or replace any part of the design
- add any element (text, watermark, decoration, signature, frame) to the design
- remove any element from the design
- "improve", "stylise", "embroider", "render in fabric thread", "render in stitches", or otherwise interpret the design — apply it as a flat printed graphic only
- alter faces, photographs, brand marks, or text in ANY way — these are sacred and must be reproduced pixel-for-pixel from the source

THE ONLY TRANSFORMATIONS PERMITTED ARE:
- proportional scaling of the WHOLE design to fit the print area
- realistic perspective consistent with the product surface (e.g. flat for a t-shirt face, cylindrical projection for a mug body, gentle curvature for a cap front panel)
- a thin natural fabric / material texture overlay so the print looks physically applied to the product surface

If you cannot apply the design without altering its content, return a clean product mockup WITHOUT the design rather than a modified version of the design.
```

---

## Per-product prompts

Each prompt below is the **product-specific section** that follows the shared header.

### 🎽 T-Shirt (`tshirt`)

```
PRODUCT: heather grey cotton t-shirt, laid flat on a soft neutral background. Soft natural studio lighting, premium product photography style, fabric texture and stitching visible.

PRINT PLACEMENT: place the entire design on the chest area at a natural graphic size, centred horizontally, top edge approximately four inches below the collar. The design itself must remain unchanged — only fabric-weave overlay and natural drape perspective are allowed.
```

### 🧥 Pullover Hoodie (`hoodie`)

```
PRODUCT: black pullover hoodie with kangaroo pocket and drawstrings, laid flat on a soft neutral background. Studio lighting, premium product photography style, fleece texture visible.

PRINT PLACEMENT: place the entire design on the chest area, centred horizontally above the kangaroo pocket. The design itself must remain unchanged — only fabric texture overlay and natural drape are allowed.
```

### ☕ Coffee Mug (`mug`)

```
PRODUCT: white ceramic 11oz coffee mug with handle on the right, sitting on a wooden surface, viewed from the front. Soft natural lighting, premium product photography style, ceramic glaze visible.

PRINT PLACEMENT: apply the entire design to the visible front face of the mug body, centred. The design itself must remain unchanged — the ONLY additional transformation permitted is the cylindrical surface projection required to wrap a flat image around a cylinder. Scale the design DOWN if necessary so the entire design remains visible on the curved surface; never crop it.
```

### 👜 Tote Bag (`tote`)

```
PRODUCT: natural canvas tote bag with two leather handles, standing upright against a soft neutral background. Studio lighting, premium product photography style, canvas weave visible.

PRINT PLACEMENT: place the entire design centred on the front panel of the tote at a natural graphic size. The design itself must remain unchanged — only canvas-weave texture overlay is allowed.
```

### 🏖 Beach Towel (`towel`)

```
PRODUCT: folded beach towel resting on light sand, viewed from above-front. Bright natural daylight, premium product photography style, soft microfiber texture visible.

PRINT PLACEMENT: place the entire design centred on the visible folded top section of the towel. The design itself must remain unchanged — only soft microfiber texture overlay is allowed.
```

### 🧢 Baseball Cap (`cap`)

```
PRODUCT: black structured 6-panel baseball cap with a curved brim, viewed from the front. Studio lighting, premium product photography style, fabric weave and stitching visible.

PRINT PLACEMENT: apply the entire design as a FLAT PRINTED GRAPHIC on the front centre panel of the cap, at a natural size for cap branding. DO NOT render the design as embroidery, stitching, or thread — treat it as a heat-transfer or sublimation print. The design itself must remain unchanged — the ONLY additional transformation permitted is the gentle curve of the cap front panel.
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
