import type { CollectionItem } from "@/types";

// The 5 mockup products. Every collection generates one mockup per product
// using the user's submitted image as the design.
export const MOCKUP_PRODUCTS: CollectionItem[] = [
  {
    id: "tshirt",
    title: "Premium T-Shirt",
    image: "",
    description: "Soft cotton, modern fit",
    category: "apparel",
    color_tags: [],
    style_tags: [],
    material_tags: [],
    confidence_score: 1,
  },
  {
    id: "hoodie",
    title: "Pullover Hoodie",
    image: "",
    description: "Heavyweight fleece, kangaroo pocket",
    category: "apparel",
    color_tags: [],
    style_tags: [],
    material_tags: [],
    confidence_score: 1,
  },
  {
    id: "mug",
    title: "Coffee Mug",
    image: "",
    description: "11oz ceramic, dishwasher safe",
    category: "drinkware",
    color_tags: [],
    style_tags: [],
    material_tags: [],
    confidence_score: 1,
  },
  {
    id: "tote",
    title: "Tote Bag",
    image: "",
    description: "Heavy canvas, reinforced handles",
    category: "accessories",
    color_tags: [],
    style_tags: [],
    material_tags: [],
    confidence_score: 1,
  },
  {
    id: "towel",
    title: "Beach Towel",
    image: "",
    description: "Microfiber, quick-dry",
    category: "home",
    color_tags: [],
    style_tags: [],
    material_tags: [],
    confidence_score: 1,
  },
];

export function buildCollectionItems(): CollectionItem[] {
  return MOCKUP_PRODUCTS;
}
