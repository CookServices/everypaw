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
  {
    slug: "gifts-for-pet-parents",
    title: "Unique Gifts for Pet Parents Who Already Have Everything",
    description:
      "Eleven gift ideas for pet parents who already have every toy, treat, and bandana: meaningful presents that capture their pet's story, not their closet.",
    datePublished: "2026-09-04",
    published: true,
  },
  {
    slug: "best-pet-journal-app",
    title: "Best Pet Journal Apps in 2026: What They Actually Do (and Don't)",
    description:
      "An honest comparison of pet journal apps in 2026: what each one does well, what it skips, and how to pick the right one for the way you want to remember your pet.",
    datePublished: "2026-09-04",
    published: true,
  },
  {
    slug: "pet-journal-app-vs-photo-book",
    title: "Pet Journal App vs Photo Book Service: Which One Actually Keeps the Memories?",
    description:
      "Pet journal app or photo book service? A side-by-side look at what each one captures, what it misses, and which approach keeps the real story of your pet.",
    datePublished: "2026-09-04",
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

/**
 * French edition of the same cluster. `slugEn` maps back to the matching `BlogPost.slug`
 * for reciprocal hreflang. French articles use their own (French) slugs for SEO.
 */
export interface BlogPostFr {
  slug: string;
  slugEn: string;
  title: string;
  description: string;
  /** ISO date YYYY-MM-DD */
  datePublished: string;
  published: boolean;
}

export const BLOG_POSTS_FR: BlogPostFr[] = [
  {
    slug: "prompts-journal-animalier",
    slugEn: "pet-journal-prompts",
    title: "50 idées de prompts pour votre journal animalier",
    description:
      "Ne restez plus jamais devant une page blanche : 50 prompts pour capturer les moments, les manies et les étapes importantes de votre chien ou chat, une phrase à la fois.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "idees-livre-souvenir-chien",
    slugEn: "dog-memory-book-ideas",
    title: "12 idées de livre souvenir pour votre chien, au-delà des photos",
    description:
      "12 idées de livre souvenir pour votre chien qui vont au-delà des photos : racontez son histoire, ses manies et ses moments du quotidien dans un livre que vous finirez vraiment.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "livre-souvenir-premiere-annee-chiot",
    slugEn: "puppy-first-year-memory-book",
    title: "Le livre souvenir de la première année de votre chiot (mois par mois)",
    description:
      "Un guide mois par mois pour le livre souvenir de la première année de votre chiot : quoi photographier, quoi écrire, et comment en faire un vrai livre imprimé.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "comment-tenir-journal-animalier",
    slugEn: "how-to-keep-a-pet-memory-journal",
    title: "Comment tenir un journal animalier (et pourquoi c'est important)",
    description:
      "Un guide pratique pour tenir un journal animalier : quoi écrire, à quelle fréquence, et comment transformer des notes du quotidien en une histoire que vous garderez pour toujours.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "livre-souvenir-chat",
    slugEn: "cat-memory-book",
    title: "Livre souvenir pour chat : capturer l'histoire discrète de votre chat",
    description:
      "Comment créer un livre souvenir pour chat qui capture les moments subtils : les clignements lents, les coins préférés, le chaos de 3h du matin, et tout le reste.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "idees-souvenirs-deuil-animal",
    slugEn: "pet-loss-keepsake-ideas",
    title: "Idées de souvenirs après la perte d'un animal : 9 façons d'honorer sa mémoire",
    description:
      "Neuf idées de souvenirs pour honorer un animal que vous avez perdu : livres souvenirs, journaux, pages mémorial, et d'autres façons de garder son histoire près de vous.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "ecrire-histoire-de-vie-animal",
    slugEn: "write-your-pets-life-story",
    title: "Comment écrire l'histoire de vie de votre animal (même si vous n'êtes pas écrivain)",
    description:
      "Un guide étape par étape pour écrire l'histoire de vie de votre animal : comment trouver la structure, quoi inclure, et pourquoi vous n'avez pas besoin d'être écrivain pour bien le faire.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "livre-souvenir-premiere-annee-chaton",
    slugEn: "kitten-first-year-memory-book",
    title: "Le livre souvenir de la première année de votre chaton : le guide mois par mois",
    description:
      "Un guide mois par mois pour le livre souvenir de la première année de votre chaton : quoi remarquer, quoi écrire, et comment capturer l'histoire d'un chat dès le premier jour.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "cadeaux-deuil-animalier",
    slugEn: "pet-memorial-gifts",
    title: "Cadeaux pour un deuil animalier : 7 idées attentionnées pour un ami endeuillé",
    description:
      "Sept idées de cadeaux attentionnés pour un ami qui a perdu son animal : ce qui aide vraiment, ce qu'il faut éviter, et comment montrer que vous comprenez.",
    datePublished: "2026-07-22",
    published: true,
  },
  {
    slug: "idees-cadeaux-maitres-animaux",
    slugEn: "gifts-for-pet-parents",
    title: "Idées de cadeaux originaux pour les maîtres d'animaux qui ont déjà tout",
    description:
      "Onze idées de cadeaux pour les maîtres d'animaux qui ont déjà tous les jouets, friandises et bandanas : des présents qui capturent l'histoire de leur animal, pas leur placard.",
    datePublished: "2026-09-04",
    published: true,
  },
  {
    slug: "meilleure-application-journal-animalier",
    slugEn: "best-pet-journal-app",
    title: "Meilleures applications de journal animalier en 2026 : ce qu'elles font vraiment (et ce qu'elles ne font pas)",
    description:
      "Une comparaison honnête des applications de journal animalier en 2026 : ce que chacune fait bien, ce qu'elle laisse de côté, et comment choisir celle qui correspond à votre façon de vous souvenir de votre animal.",
    datePublished: "2026-09-04",
    published: true,
  },
];

/** Published French posts, newest first. */
export function getPublishedPostsFr(): BlogPostFr[] {
  return BLOG_POSTS_FR.filter((p) => p.published).sort((a, b) =>
    b.datePublished.localeCompare(a.datePublished)
  );
}

export function getPostFr(slug: string): BlogPostFr | undefined {
  return BLOG_POSTS_FR.find((p) => p.slug === slug);
}

/** French slug for a given English slug, for reciprocal hreflang on EN article pages. */
export function getFrSlugForEn(enSlug: string): string | undefined {
  return BLOG_POSTS_FR.find((p) => p.slugEn === enSlug)?.slug;
}
