import { createFileRoute } from "@tanstack/react-router";
import { CollectionPage } from "@/components/CollectionPage";

export const Route = createFileRoute("/men")({
  head: () => ({
    meta: [
      { title: "Men's Collection — JABAL" },
      { name: "description", content: "Men's essentials from JABAL Cairo." },
    ],
  }),
  component: () => <CollectionPage gender="mens" title="Men's collection" eyebrow="Men" />,
});
