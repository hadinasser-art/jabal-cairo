import { createFileRoute } from "@tanstack/react-router";
import { CollectionPage } from "@/components/CollectionPage";

export const Route = createFileRoute("/men")({
  head: () => ({
    meta: [
      { title: "Men's Collection | JABAL" },
      {
        name: "description",
        content:
          "Shop JABAL men's everyday essentials: oversized tees, shorts, and clean minimal wardrobe staples in Egypt.",
      },
      { property: "og:title", content: "Men's Collection | JABAL" },
      {
        property: "og:description",
        content: "Minimal men's essentials from JABAL, made for everyday wear.",
      },
    ],
    links: [{ rel: "canonical", href: "https://jabalwear.com/men" }],
  }),
  component: () => <CollectionPage gender="mens" titleKey="home.men" eyebrowKey="men.eyebrow" />,
});
