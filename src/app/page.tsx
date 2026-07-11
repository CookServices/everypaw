import type { Metadata } from "next";
import Home from "./home-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: {
      "en": "/",
      "fr": "/fr",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "Everypaw, Your pet's life story, printed",
    description: "Turn your pet's daily moments into a beautiful AI-crafted book.",
    url: "/",
    siteName: "Everypaw",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Everypaw, Your pet's life story, printed" }],
  },
};

export default Home;
