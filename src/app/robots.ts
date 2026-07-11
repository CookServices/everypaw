import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api", "/auth", "/unsubscribe"],
      },
    ],
    sitemap: "https://everypaw.app/sitemap.xml",
  };
}
