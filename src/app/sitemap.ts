import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.appUrl.replace(/\/$/, "");
  const routes = ["", "/about", "/complaints", "/complaints/track", "/notices", "/development", "/services", "/community", "/contact", "/help", "/privacy", "/terms"];
  return routes.map((r) => ({ url: `${base}${r}`, lastModified: new Date(), changeFrequency: r === "" ? "daily" : "weekly", priority: r === "" ? 1 : 0.7 }));
}
