/**
 * Blog article registry — single source of truth for the SEO content cluster.
 * Drives the /blog index listing, sitemap inclusion, and per-article noindex.
 * `published: false` → article renders with noindex, excluded from index + sitemap.
 * Flip to `true` (and fill the article body) once the content is ready.
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO date YYYY-MM-DD */
  datePublished: string;
  published: boolean;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "pet-journal-prompts",
    title: "Pet Journal Prompts",
    description: "Placeholder article — content coming soon.",
    datePublished: "2026-07-12",
    published: false,
  },
];

/** Published posts, newest first. */
export function getPublishedPosts(): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.published).sort((a, b) =>
    b.datePublished.localeCompare(a.datePublished)
  );
}

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
