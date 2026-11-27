import type { MetadataRoute } from "next";
import { brandName, brandTagline } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandName,
    short_name: brandName,
    description: brandTagline,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#00786f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
