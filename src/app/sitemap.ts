import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://everypaw.app";
  const now = new Date();

  return [
    { url: `${base}/`,                          lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/fr/`,                        lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/legal/cgv`,                  lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/mentions`,             lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/contact`,                    lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
