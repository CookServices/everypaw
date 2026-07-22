import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("cat-memory-book")!;
const frSlug = getFrSlugForEn(post.slug);

export const metadata: Metadata = {
  title: `${post.title} | Everypaw`,
  description: post.description,
  alternates: {
    canonical: `/blog/${post.slug}`,
    languages: { en: `/blog/${post.slug}`, fr: frSlug ? `/fr/blog/${frSlug}` : undefined, "x-default": `/blog/${post.slug}` },
  },
  // noindex while unpublished; flip via the registry `published` flag once content lands
  robots: post.published ? undefined : { index: false, follow: false },
};

// Article schema is emitted only once the post is published (no schema for empty content)
const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  datePublished: post.datePublished,
  author: { "@type": "Organization", name: "Everypaw", url: "https://everypaw.app" },
  publisher: {
    "@type": "Organization",
    name: "Everypaw",
    logo: { "@type": "ImageObject", url: "https://everypaw.app/og-image.png" },
  },
};

export default function Page() {
  return (
    <>
      {post.published && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSONLD) }} />
      )}
      <ArticleLayout post={post}>
        <p>
          Dog people have an easy time journaling. Dogs have walks, greetings, visible emotions, and a social calendar.
          Cats have none of that, or rather, cats have all of that on their own terms, at 3am, in ways that look like
          nothing is happening until you pay close attention.
        </p>
        <p>
          That&rsquo;s why most pet memory content skews toward dogs, and why cat owners often feel like the advice
          doesn&rsquo;t apply. It does. You just need to know what to look for. A cat memory book isn&rsquo;t built on big
          moments. It&rsquo;s built on patterns, preferences, and the slow accumulation of a personality that only
          reveals itself to the people who live with it.
        </p>

        <h2>Why cat memories fade differently</h2>
        <p>
          Dog memories tend to be event-based: the walk where he met the poodle, the day she learned to shake. Cat
          memories are atmospheric: the winter she spent entirely on the radiator shelf, the year he decided the bathtub
          was his office, the phase where she brought you a sock every morning at 6am and then stopped without
          explanation.
        </p>
        <p>
          These atmospheric memories are harder to pin down, which means they&rsquo;re the first to blur. You won&rsquo;t
          forget your cat. But you will forget which shelf, which sock, which winter. A memory book is how you keep the
          specifics.
        </p>

        <h2>What to capture about a cat</h2>

        <h3>The chosen spots</h3>
        <p>
          Cats curate their environment with the seriousness of a museum director. Document where they sit, sleep, hide,
          and observe, season by season. A cat&rsquo;s spot history is a biography in miniature: the sunny window in
          summer, the laundry pile in winter, the box that arrived in March and became permanent furniture.
        </p>

        <h3>The routine, decoded</h3>
        <p>
          Every cat has a schedule that looks random from the outside and is in fact ruthlessly precise. Map it: when
          they eat, when they patrol, when they demand attention, when they vanish, when they reappear and act like
          nothing happened. Write it down once, then again six months later, and compare.
        </p>

        <h3>The sounds</h3>
        <p>
          Cats have a vocal range they deploy selectively. The short chirp at birds. The long, questioning meow when
          you&rsquo;re in a room they can&rsquo;t see. The silent mouth-open &ldquo;meow&rdquo; that might be the most
          expressive sound of all. Describe them. Recordings help, but words capture what the sound means to you.
        </p>

        <h3>The slow blink and other signals</h3>
        <p>
          The slow blink, the headbutt, the belly display (trap or invitation, and how you learned which), the tail
          positions. These are a cat&rsquo;s emotional vocabulary, and they&rsquo;re specific to your cat. What counts as
          affection in your household is worth writing down, because no one else will understand it the same way.
        </p>

        <h3>The 3am chapter</h3>
        <p>
          Every cat owner has stories that only happen at night. Give them their own section. Future-you will appreciate
          the specificity: &ldquo;3:17am, full sprint from bedroom to kitchen, knocked over the water glass, sat next to
          it looking offended.&rdquo;
        </p>

        <h3>The relationship with the household</h3>
        <p>
          How they interact with each family member differently. The person they follow, the person they ignore, the
          guest who somehow earned instant trust, the other pet they pretend doesn&rsquo;t exist. Cats have opinions
          about everyone, and those opinions are half the story.
        </p>

        <h2>Prompts that work for cats</h2>
        <p>
          Generic pet journal prompts lean toward dogs (&ldquo;describe today&rsquo;s walk&rdquo; doesn&rsquo;t apply to
          a cat who hasn&rsquo;t left the apartment in four years). Here are a few that fit the feline experience:
        </p>
        <ul>
          <li>Where did they spend most of today, and has that changed recently?</li>
          <li>
            What did they do when you came home? Be specific: did they come to the door, or did you find them pretending
            they hadn&rsquo;t noticed?
          </li>
          <li>Describe the last time they brought you something (a toy, a leaf, something worse).</li>
          <li>What&rsquo;s their current opinion of the nearest window?</li>
          <li>How do they ask for food versus how they ask for attention? What&rsquo;s different?</li>
          <li>Describe the weirdest position they slept in this week.</li>
        </ul>
        <p>
          For a longer list that covers both dogs and cats, the{" "}
          <a href="/blog/pet-journal-prompts">50 pet journal prompts</a> article has sections on personality,
          milestones, and the harder chapters that apply just as well to cats.
        </p>

        <h2>Making a book that feels like a cat</h2>
        <p>
          A dog memory book can follow a chronological, event-driven structure. A cat memory book works better organized
          by theme: their territory, their routines, their relationships, their quirks. Chronology still matters (date
          everything), but the chapters should mirror how a cat lives, in patterns rather than plot points.
        </p>
        <p>A few structural ideas:</p>
        <ul>
          <li>
            One page per &ldquo;era&rdquo; defined by where they slept (the radiator era, the cardboard box era, the
            forbidden-dresser era).
          </li>
          <li>A section for the things they destroyed, with photographic evidence and approximate timelines.</li>
          <li>
            A page of direct quotes: the things you say to your cat out loud, knowing they don&rsquo;t care, arranged
            without commentary.
          </li>
          <li>A then-and-now photo pair if you have kitten photos, same angle, same spot.</li>
        </ul>
        <p>
          For more page ideas that work across species, the{" "}
          <a href="/blog/dog-memory-book-ideas">dog memory book ideas</a> article has structures (origin chapter,
          nickname timeline, letters) that translate well to cats with minor adjustments.
        </p>

        <h2>Journaling a senior cat or a cat you&rsquo;ve lost</h2>
        <p>
          Senior cats change slowly enough that you don&rsquo;t notice until you look back. The naps get longer. The
          jumps get lower. The routine narrows. These changes are worth documenting with tenderness, because they&rsquo;re
          part of the story too.
        </p>
        <p>
          If you&rsquo;re journaling after losing a cat, or looking for ways to keep their memory tangible, the{" "}
          <a href="/blog/pet-loss-keepsake-ideas">pet loss keepsake ideas</a> article covers several approaches, and the{" "}
          <a href="/memorial">Everypaw memorial page</a> was designed for exactly that kind of remembering.
        </p>
        <p>
          If your cat is still in their first year, the{" "}
          <a href="/blog/kitten-first-year-memory-book">kitten first year memory book guide</a> has a month-by-month
          structure designed for that fastest phase.
        </p>

        <h2>Start with what&rsquo;s in front of you</h2>
        <p>
          Right now, your cat is probably doing something completely unremarkable: sleeping in a spot they claimed last
          week, ignoring a toy, staring at a wall with conviction. Write it down. One sentence. That&rsquo;s how a cat
          memory book starts, not with a milestone, but with a Tuesday afternoon that only you would think to notice.
        </p>
        <p>
          Everypaw works the same way for cats as for dogs: you journal the small moments, AI turns them into monthly
          story chapters, and those chapters become a printed hardcover book. If you want a broader guide to getting
          started, the <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> covers the method,
          the frequency, and how to make journaling stick.
        </p>
      </ArticleLayout>
    </>
  );
}
