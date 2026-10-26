import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_STATIC === "true" ? "/feed" : "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brainfeed",
    short_name: "Brainfeed",
    description: "Today's most important news, explained simply, then readable in full.",
    id: `${BASE}/`,
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#0d0c0b",
    theme_color: "#0d0c0b",
    icons: [
      { src: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${BASE}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "The brief", url: `${BASE}/brief/` },
      { name: "Review", url: `${BASE}/recall/` },
      { name: "Search", url: `${BASE}/search/` },
    ],
  };
}
