# Collections Page — handoff

A simple Collections page for **In Motion**: empty state shows a centered radial "engine" motif; once the user creates products, they appear as tiles in a grid.

## Files

```
CollectionsPage.tsx          ← the page (drop into your app router / pages dir)
collections.css              ← plain CSS, page-scoped via .cp-* classes
public/assets/
  engine-background.png      ← radial motif
  logo-mark.png              ← In Motion brand mark
```

That's it. No new deps, no Tailwind, no CSS modules.

## Using it

```tsx
// app/collections/page.tsx (Next.js)
import { CollectionsPage } from "@/components/CollectionsPage";

export default function Page() {
  return <CollectionsPage />;
}
```

Make sure `collections.css` is imported once (in your root layout, or at the top of `CollectionsPage.tsx` — I left the import there so it travels with the file).

Make sure `public/assets/engine-background.png` and `public/assets/logo-mark.png` are present.

## What it does

- **Empty state**: motif + centered "Create your first product" CTA.
- **Populated state**: motif fades to a faint backdrop; tiles fill an auto-fill grid; a dashed `+ New product` tile sits at the end.
- Tiles are buttons — pass `onOpenProduct` to wire navigation.
- The page tracks products in component state. Replace `useState` with your real store / API when you're ready.

## Design notes

- Pale-slate canvas (`#EEF1F4`), Geist font, sky-blue brand accent (`#289BFF`), 12 px card radii, hairline borders. Matches the In Motion design system.
- Motif breathes very slowly (9 s); respects `prefers-reduced-motion`.
- I used the project's `.container` / `.grid` / `.card` / `.badge` utility classes where they fit naturally (grid layout, tile cards, status chips). Page-specific styling lives in `collections.css` under a `.cp-*` namespace so it can't collide.

## Open questions

1. Does **Create** open a modal, navigate to a wizard, or inline-create with a default name? Right now it inline-creates `Untitled product N`.
2. What goes in the tile preview? It's a soft slate gradient placeholder.
3. Search / filter / sort once collections grow?
