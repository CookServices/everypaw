import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost } from "@/lib/blog";

const post = getPost("pet-loss-keepsake-ideas")!;

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
          When a pet dies, the grief is immediate. The keepsake question comes later, sometimes weeks later, sometimes
          months: how do I keep them close in a way that feels like them, not like a product?
        </p>
        <p>
          There&rsquo;s no right answer. Some people want something they can hold. Some want something they can read.
          Some want a quiet place online where the memory lives on its own terms. What follows are nine ideas, roughly
          ordered from the most tangible to the most personal, each one a different way of saying: they were here, and it
          mattered.
        </p>

        <h2>1. A memory book built from your own words</h2>
        <p>
          If you kept any kind of journal, notes, or even photo captions while your pet was alive, those fragments are
          the raw material for a memory book that sounds like your life together, not like a template. Even a handful of
          dated entries, rearranged by chapter (their personality, the routines, the milestones, the hard days), can
          become something you&rsquo;ll want to hold.
        </p>
        <p>
          If you&rsquo;re starting from scratch after a loss, it&rsquo;s not too late. Sit down with a friend who knew
          your pet and write what you remember, while the details are still sharp. The{" "}
          <a href="/blog/pet-journal-prompts">pet journal prompts</a> list has a section on &ldquo;the harder
          chapters&rdquo; that can help you find the right starting points.
        </p>

        <h2>2. A printed photo book with context</h2>
        <p>
          Photo books are common. What makes one a keepsake instead of a shelf decoration is context: a date and a
          sentence under each photo explaining what was happening and why it mattered. &ldquo;July 2025, the day she
          finally trusted the stairs&rdquo; turns a blurry photo into a story. Without that line, it&rsquo;s just a
          blurry photo.
        </p>
        <p>
          If you have a dog, the <a href="/blog/dog-memory-book-ideas">dog memory book ideas</a> article has page
          structures (the origin chapter, the nickname timeline, the trouble chapter) that work especially well for
          memorial books. For cats, the <a href="/blog/cat-memory-book">cat memory book</a> guide covers what to capture
          about a quieter kind of companion.
        </p>

        <h2>3. A memorial page</h2>
        <p>
          A dedicated online page for your pet, visible to anyone you share the link with, where their photo, their
          story, and messages from people who loved them live in one place. It&rsquo;s less ephemeral than a social media
          post and more shareable than a physical book.
        </p>
        <p>
          Everypaw has a <a href="/memorial">memorial page feature</a> designed for this: a quiet, permanent space with
          their photo, your message, their AI-generated stories, and a place for tributes from others.
        </p>

        <h2>4. A letter you don&rsquo;t send</h2>
        <p>
          Write them a letter. Say the things you said out loud when no one was listening, and the things you never got
          to say at all. Date it. You don&rsquo;t have to share it, publish it, or even reread it. The act of writing it
          is the keepsake.
        </p>
        <p>Some people write one letter. Some write one every year on the anniversary. Both are valid.</p>

        <h2>5. A donation in their name</h2>
        <p>
          Choose a shelter, a rescue, or a veterinary fund that aligns with who they were: the breed rescue that saved
          them, the shelter where you met, the vet school that treated them. A small recurring donation turns their name
          into something that continues to help animals like them.
        </p>

        <h2>6. A routine you keep</h2>
        <p>
          This one is invisible and free. Keep one of their routines: the evening walk at the same time, the spot on the
          couch you leave empty for a while, the treat jar that stays on the counter. Routines are how pets structured
          your day, and keeping one is a quiet, daily act of remembering.
        </p>

        <h2>7. A garden marker or planted tree</h2>
        <p>
          Something living, in a place you&rsquo;ll see regularly. A tree planted on the anniversary, a stone in the
          garden, a pot on the balcony. The point isn&rsquo;t the object; it&rsquo;s the place. A fixed point where the
          memory has a physical home.
        </p>

        <h2>8. Their collar or tag, kept intentionally</h2>
        <p>
          Most people keep the collar. The difference between a keepsake and a drawer item is intention. Frame it, hang
          it, attach it to something you use, or place it somewhere you&rsquo;ll see it. Don&rsquo;t let it disappear
          into a box. The objects that matter need a place.
        </p>

        <h2>9. Their story, written down</h2>
        <p>
          This is the simplest and the hardest. Sit down and write the story of your life together, from the day you met
          to the day they left. It doesn&rsquo;t have to be long. It doesn&rsquo;t have to be good. It just has to be
          honest: the funny parts, the hard parts, the ordinary afternoons that turned out to be the whole point.
        </p>
        <p>
          If you kept a journal while they were alive, you already have the material. If not, write from memory now. The{" "}
          <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> has advice on how to write
          entries that age well, and that same approach works just as well for writing backwards, capturing what you
          remember before the details fade further.
        </p>

        <h2>There&rsquo;s no deadline</h2>
        <p>
          Grief doesn&rsquo;t follow a schedule, and neither should a keepsake. If you&rsquo;re not ready to make
          something, don&rsquo;t. The memories aren&rsquo;t going anywhere yet. And when you are ready, start with
          whatever feels manageable: one photo with a caption, one paragraph, one sentence. The rest can come later, or
          not at all. The point was never the object. The point was them.
        </p>
      </ArticleLayout>
    </>
  );
}
