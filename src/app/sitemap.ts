import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://everypaw.app";
  const now = new Date();

  return [
    { url: `${base}/`,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/fr`,             lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/gift`,           lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/fr/gift`,        lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/memorial`,       lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`,        lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/terms`,    lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/privacy`,  lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/notices`,  lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
