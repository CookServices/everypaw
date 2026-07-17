/**
 * Blog article registry: single source of truth for the SEO content cluster.
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
    title: "50 Pet Journal Prompts to Capture Your Pet's Story",
    description:
      "Never stare at a blank page again: 50 pet journal prompts to capture your dog or cat's daily moments, quirks, and milestones, one sentence at a time.",
    datePublished: "2026-07-13",
    published: true,
  },
  {
    slug: "dog-memory-book-ideas",
    title: "12 Dog Memory Book Ideas That Go Beyond Photos",
    description:
      "12 dog memory book ideas that go beyond photos: capture your dog's story, quirks, and everyday moments in a keepsake book you'll actually finish.",
    datePublished: "2026-07-16",
    published: true,
  },
  {
    slug: "puppy-first-year-memory-book",
    title: "How to Make a Puppy's First Year Memory Book (Month by Month)",
    description:
      "A month-by-month guide to your puppy's first year memory book: what to photograph, what to write down, and how to turn it all into a real printed book.",
    datePublished: "2026-07-17",
    published: true,
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
