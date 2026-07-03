import { createFileRoute } from "@tanstack/react-router";
import { CollectionPage } from "@/components/CollectionPage";

export const Route = createFileRoute("/women")({
  head: () => ({
    meta: [
      { title: "Women's Collection — JABAL" },
      { name: "description", content: "Women's essentials from JABAL." },
    ],
  }),
  component: () => (
    <CollectionPage gender="womens" titleKey="home.women" eyebrowKey="women.eyebrow" />
  ),
});
