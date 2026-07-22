import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("pet-journal-app-vs-photo-book")!;
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
          You want to keep your pet&rsquo;s memories. You have two obvious options: download a journal app and start
          writing, or upload your photos to a book service and order a print. Both claim to preserve what matters.
          But they preserve very different things, and choosing the wrong one for your intention means ending up
          with a product that feels incomplete.
        </p>
        <p>
          Here&rsquo;s a side-by-side look at what each approach captures, what it misses, and where the two
          overlap.
        </p>

        <h2>What a photo book service gives you</h2>
        <p>
          Services like Shutterfly, Mixbook, or Chatbooks let you upload photos, arrange them on templates, add
          captions, and order a printed book. The output is beautiful and tangible. You get a physical object on
          your shelf.
        </p>
        <p>
          The strength is visual impact. A well-made photo book captures what your pet looked like at every stage:
          the puppy fuzz, the first snow, the backyard at golden hour. If your goal is a visual record, photo books
          deliver.
        </p>
        <p>
          The weakness is context. A photo of your dog on the couch is a photo of your dog on the couch. Without a
          caption, future-you won&rsquo;t know that this was the first day she claimed that spot, or that it was
          right after a thunderstorm, or that she&rsquo;d just stolen a sock and was pretending to be innocent. And
          in practice, most people skip the captions. The assembly project is already demanding enough without
          writing sentences for each of the sixty photos you selected.
        </p>
        <p>
          The other weakness is the assembly itself. Photo book services require a dedicated session: select
          photos, upload them, choose a layout, write captions, review, order. Most people intend to do this. The
          completion rate tells a different story. The photos sit in the camera roll, the &ldquo;someday&rdquo;
          project stays on the list, and the book never gets made.
        </p>

        <h2>What a pet journal app gives you</h2>
        <p>
          A journal app (whether it&rsquo;s a dedicated pet app like Everypaw, or a general notes app) captures
          words: what happened, why it mattered, what it felt like. The strength is the story. A journal entry from
          an ordinary Tuesday, written in thirty seconds, preserves exactly the kind of information that photos
          can&rsquo;t: the sound they made, the routine they invented, the way they asked for dinner.
        </p>
        <p>
          The barrier to entry is lower, too. One sentence is a complete journal entry. You can write it on your
          phone while your dog eats breakfast. There&rsquo;s no upload step, no layout decision, no ordering
          process.
        </p>
        <p>
          The weakness is visual. A journal without photos is text. It preserves meaning but not appearance. If you
          want to see what your kitten&rsquo;s paws looked like at eight weeks, words alone don&rsquo;t do it.
        </p>
        <p>
          The other difference is output format. Most journal apps produce a digital record: a list of entries you
          can scroll through. Some, like Everypaw, go further: AI turns your entries into monthly story chapters,
          and those chapters become a printed hardcover book at the end of the year, which bridges the gap between
          journal and physical product.
        </p>

        <h2>What each one misses</h2>
        <p>
          A photo book without words captures appearance without meaning. In five years, you&rsquo;ll look at the
          photos and feel something, but you won&rsquo;t remember the specifics. The context is gone.
        </p>
        <p>
          A journal without photos captures meaning without appearance. You&rsquo;ll remember that she was afraid of
          the vacuum until March, but you won&rsquo;t see the face she made.
        </p>
        <p>
          Neither approach, on its own, captures the full story. The complete version has both: the image and the
          sentence that explains it.
        </p>

        <h2>The real comparison</h2>
        <p>The question isn&rsquo;t which format is better. It&rsquo;s which habit you&rsquo;ll actually sustain.</p>
        <p>
          <strong>Choose a photo book service if:</strong> you already take a lot of photos, you enjoy design and
          layout work, and you&rsquo;re willing to block out a half-day to assemble the book. If you&rsquo;re the
          kind of person who finishes scrapbook projects, a photo book service will produce something gorgeous. Add
          captions. Date everything. Future-you will thank you.
        </p>
        <p>
          <strong>Choose a journal app if:</strong> you want the lowest possible friction, you&rsquo;re more likely
          to write a sentence than to curate an album, and you value the story behind the photo more than the photo
          itself. If you&rsquo;re not sure what to write, the{" "}
          <a href="/blog/pet-journal-prompts">pet journal prompts</a> list gets you past the blank page immediately.
        </p>
        <p>
          <strong>Choose both if:</strong> you want the full picture. Use a journal app for the daily moments and
          words, and a photo book service for the visual milestones. They complement each other well because they
          capture different things.
        </p>

        <h2>Where Everypaw fits</h2>
        <p>
          Everypaw sits at the intersection of the two: you journal the words daily (one sentence is enough), AI
          turns them into monthly story chapters, and those chapters become a printed hardcover book. It&rsquo;s a
          journal with the output of a book service, minus the assembly project.
        </p>
        <p>
          It doesn&rsquo;t replace a photo book if your primary goal is a visual album. But if your goal is a
          written record of your pet&rsquo;s life that ends up as a physical book without requiring a dedicated
          assembly session, it fills the gap between the two categories.
        </p>
        <p>
          For more on building a journaling habit, the{" "}
          <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> covers frequency and format.
          For specific page and chapter ideas regardless of which tool you use, the{" "}
          <a href="/blog/dog-memory-book-ideas">dog memory book ideas</a> and{" "}
          <a href="/blog/kitten-first-year-memory-book">kitten first year guide</a> have structures that work in any
          medium.
        </p>

        <h2>The only wrong choice</h2>
        <p>
          The only wrong choice is the one you don&rsquo;t use. A beautiful photo book service that never gets
          assembled preserves nothing. A journal app that gets opened once and forgotten preserves nothing. Pick the
          approach that matches your actual habits, not your aspirations, and start today. The memories are already
          fading.
        </p>
      </ArticleLayout>
    </>
  );
}
