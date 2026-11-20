import type { MetadataRoute } from "next";

// Colours come from the tokens in globals.css: --ground (light) for the splash and browser bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tripsplit",
    short_name: "Tripsplit",
    description: "Plan the trip. Split the bill. A shareable itinerary and fair cost splitter for friend groups.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f4",
    theme_color: "#f3f5f4",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
