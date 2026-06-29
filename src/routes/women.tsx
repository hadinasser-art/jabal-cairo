import { createFileRoute } from "@tanstack/react-router";
import { CollectionPage } from "@/components/CollectionPage";

export const Route = createFileRoute("/women")({
  head: () => ({
    meta: [
      { title: "Women's Collection — JABAL" },
      { name: "description", content: "Women's essentials from JABAL Cairo." },
    ],
  }),
  component: () => <CollectionPage gender="womens" title="Women's collection" eyebrow="Women" />,
});
