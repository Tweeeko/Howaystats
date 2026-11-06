import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getNews } from "@/lib/database/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl();
  const pages = ["", "/premier-league", "/newcastle", "/mackem-watch", "/tyne", "/news", "/memes", "/how-it-works"];
  const news = await getNews({ limit: 200 }).catch(() => []);
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "hourly" as const, priority: p === "" ? 1 : 0.8 })),
    ...news.map((a) => ({ url: `${base}/news/${a.slug}`, lastModified: a.publishedAt ?? undefined, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
