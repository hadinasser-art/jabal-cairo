import { createFileRoute } from "@tanstack/react-router";
import { CollectionPage } from "@/components/CollectionPage";

export const Route = createFileRoute("/women")({
  head: () => ({
    meta: [
      { title: "Women's Collection | JABAL" },
      {
        name: "description",
        content:
          "Shop JABAL women's everyday essentials: clean minimal basics and wardrobe staples made for everyday wear in Egypt.",
      },
      { property: "og:title", content: "Women's Collection | JABAL" },
      {
        property: "og:description",
        content: "Minimal women's essentials from JABAL, made for everyday wear.",
      },
    ],
    links: [{ rel: "canonical", href: "https://jabalwear.com/women" }],
  }),
  component: () => (
    <CollectionPage gender="womens" titleKey="home.women" eyebrowKey="women.eyebrow" />
  ),
});
