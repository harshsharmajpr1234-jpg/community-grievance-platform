import type { MetadataRoute } from "next";
import { BRAND } from "@/shared/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: "JSNM",
    description: BRAND.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1d4ed8",
    lang: "hi",
    icons: [
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "जनसमस्या दर्ज करें", url: "/complaints" },
      { name: "शिकायत ट्रैक करें", url: "/complaints/track" },
      { name: "सूचनाएँ", url: "/notices" },
    ],
  };
}
