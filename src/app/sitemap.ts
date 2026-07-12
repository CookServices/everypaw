import { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://everypaw.app";
  const now = new Date();

  const blogPosts: MetadataRoute.Sitemap = getPublishedPosts().map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(`${post.datePublished}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    { url: `${base}/`,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/fr`,             lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/gift`,           lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/fr/gift`,        lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/memorial`,       lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/blog`,           lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${base}/contact`,        lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/legal/terms`,    lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/privacy`,  lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/notices`,  lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    ...blogPosts,
  ];
}
