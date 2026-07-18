import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost } from "@/lib/blog";

const post = getPost("dog-memory-book-ideas")!;

export const metadata: Metadata = {
  title: `${post.title} | Everypaw`,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
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
          Your camera roll has hundreds of photos of your dog. Now ask yourself an uncomfortable question: for how many
          of them could you still say what was happening that day, and why you reached for your phone?
        </p>
        <p>
          That&rsquo;s the gap a dog memory book fills. It&rsquo;s not a photo album. It&rsquo;s the story around the
          photos: the context, the quirks, the chaos, the ordinary Tuesdays. Here are twelve ideas for building one that
          actually feels like your dog, plus the one habit that decides whether the book ever gets finished.
        </p>

        <h2>Start with stories, not photos</h2>
        <p>
          Photos capture what a moment looked like. A memory book needs why it mattered, and that part lives only in your
          memory, which is exactly the part that fades. So before you think about layouts, paper, or printing, start
          collecting short written notes alongside your photos: one or two sentences per moment, written close to when it
          happened. If you&rsquo;re not sure what to write, a list of{" "}
          <a href="/blog/pet-journal-prompts">pet journal prompts</a> solves the blank-page problem in thirty seconds.
        </p>
        <p>
          With that habit in place, every idea below becomes easy. Without it, most of them are impossible to
          reconstruct later.
        </p>

        <h2>Six pages that tell who your dog is</h2>

        <h3>1. The origin chapter</h3>
        <p>
          The day they came home: how you found them, the ride back, the first night, and why this dog and not another.
          You&rsquo;re certain you&rsquo;ll remember these details forever. Write them down anyway; the certainty fades
          faster than you think.
        </p>

        <h3>2. Their personal dictionary</h3>
        <p>
          The words they actually know, the sounds they make and what each one means, and the commands they technically
          know but choose to negotiate. This page gets funnier every year.
        </p>

        <h3>3. The nickname timeline</h3>
        <p>
          Every dog accumulates names. List them in order of appearance, each with its origin story: the incident, the
          mispronunciation, the toddler who couldn&rsquo;t say the real one.
        </p>

        <h3>4. A map of their world</h3>
        <p>
          Draw or annotate the regular walk: the corner that must be sniffed, the house with the cat, the spot where
          they always slow down, the bench where you both rest. A dog&rsquo;s territory is a biography.
        </p>

        <h3>5. Likes and dislikes, ranked</h3>
        <p>
          A solemn official ranking of foods, humans, parks, and weather, ideally with photographic evidence attached to
          the top and bottom entries.
        </p>

        <h3>6. The toy hall of fame</h3>
        <p>
          Portraits of the toys they loved to destruction, with names and approximate dates of service. Anyone who has
          ever thrown away a disintegrated stuffed duck knows why this page matters.
        </p>

        <h2>Six pages for the moments you&rsquo;ll forget</h2>

        <h3>7. An ordinary Tuesday</h3>
        <p>
          Document one perfectly normal day, hour by hour: the wake-up, the breakfast dance, the nap positions, the
          window patrol, the evening collapse. Nothing happens on this page, and in ten years it will be the one you
          can&rsquo;t stop reading.
        </p>

        <h3>8. The firsts page</h3>
        <p>
          First snow, first sea, first stairs, first thunder, the historic truce with the vacuum. Firsts don&rsquo;t
          stop after puppyhood; they just stop getting recorded.
        </p>

        <h3>9. Partners in crime</h3>
        <p>
          Their dog friends, their favorite humans, the cat they pretend to tolerate. Relationships are half of a
          dog&rsquo;s life and almost never make it into the album.
        </p>

        <h3>10. The trouble chapter</h3>
        <p>
          The best disasters, told with love: the sock heist, the garbage incident, the couch. Time turns these into
          your favorite stories. Give them the page they deserve.
        </p>

        <h3>11. Four seasons, one spot</h3>
        <p>
          The same place, photographed four times across the year with your dog in it. If you have puppy photos from
          that spot, add a then-and-now pair.
        </p>

        <h3>12. Letters to them</h3>
        <p>
          A short letter on each birthday. Watch how your own voice changes over the years; this quietly becomes a
          journal about you, too. If you&rsquo;re writing letters to a pet who&rsquo;s gone, the{" "}
          <a href="/blog/pet-loss-keepsake-ideas">pet loss keepsake ideas</a> article has other ways to honor their
          memory.
        </p>

        <h2>Make it feel like them, not like a template</h2>
        <ul>
          <li>
            Give every photo a caption with a date and one sentence of context. &ldquo;Why we were laughing&rdquo; is
            worth more than perfect lighting.
          </li>
          <li>
            If you talk in their &ldquo;voice&rdquo; at home, write some captions in it. The book should sound like your
            household.
          </li>
          <li>
            Keep the blurry photo if the story behind it is good. Blur usually means something was happening.
          </li>
          <li>
            Choose real routines over posed shots. The way they actually sleep beats the way they sit for treats.
          </li>
        </ul>

        <h2>The habit that decides everything</h2>
        <p>
          Most memory book projects don&rsquo;t fail at the design stage. They fail at &ldquo;I&rsquo;ll sort through my
          photos someday.&rdquo; The way around it is to build the book as you live it: one short note per moment,
          written the day it happens. Do that, and assembling a dog memory book becomes an afternoon instead of a
          mountain. The <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> has more on
          building that daily habit and making entries that hold up years later.
        </p>
        <p>
          That&rsquo;s how Everypaw approaches it: you jot down the small moments, AI turns them into monthly story
          chapters, and at the end of the year they become a printed hardcover book. However you do it, start with
          tonight&rsquo;s walk.
        </p>
      </ArticleLayout>
    </>
  );
}
