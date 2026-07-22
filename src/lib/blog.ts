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
  {
    slug: "how-to-keep-a-pet-memory-journal",
    title: "How to Keep a Pet Memory Journal (and Why It Matters)",
    description:
      "A practical guide to keeping a pet memory journal: what to write, how often, and how to turn everyday notes into a story you'll keep forever.",
    datePublished: "2026-07-21",
    published: true,
  },
  {
    slug: "cat-memory-book",
    title: "Cat Memory Book: How to Capture Your Cat's Quiet Story",
    description:
      "How to make a cat memory book that captures the subtle moments: the slow blinks, the chosen spots, the 3am chaos, and everything in between.",
    datePublished: "2026-07-21",
    published: true,
  },
  {
    slug: "pet-loss-keepsake-ideas",
    title: "Pet Loss Keepsake Ideas: 9 Ways to Honor a Pet You've Lost",
    description:
      "Nine pet loss keepsake ideas to honor a pet you've lost: memory books, journals, memorial pages, and other ways to keep their story close.",
    datePublished: "2026-07-21",
    published: true,
  },
  {
    slug: "write-your-pets-life-story",
    title: "How to Write Your Pet's Life Story (Even If You're Not a Writer)",
    description:
      "A step-by-step guide to writing your pet's life story: how to find the structure, what to include, and why you don't need to be a writer to do it well.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "kitten-first-year-memory-book",
    title: "Kitten First Year Memory Book: A Month-by-Month Guide",
    description:
      "A month-by-month guide to your kitten's first year memory book: what to notice, what to write down, and how to capture a cat's story from day one.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "pet-memorial-gifts",
    title: "Pet Memorial Gifts: 7 Thoughtful Ideas for a Grieving Friend",
    description:
      "Seven thoughtful pet memorial gift ideas for a friend who has lost a pet: what actually helps, what to avoid, and how to show you understand.",
    datePublished: "2026-07-22",
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
