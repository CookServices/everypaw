import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("pet-scrapbook-ideas")!;
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
          Search &ldquo;pet scrapbook ideas&rdquo; and you&rsquo;ll find pages full of layouts, stickers, washi tape,
          and die-cut paw prints. Search &ldquo;pet memory book&rdquo; and you&rsquo;ll find journals with prompts,
          story chapters, and printed hardcovers. Both claim to preserve your pet&rsquo;s memories. But they do it
          differently, and understanding the difference before you start saves you from building something beautiful
          that&rsquo;s missing the one thing you&rsquo;ll actually want later.
        </p>
        <p>
          Here&rsquo;s what each approach does well, where it falls short, and how to decide which one fits the way
          you actually want to remember your pet.
        </p>

        <h2>What a pet scrapbook does</h2>
        <p>
          A scrapbook is a visual project. You select photos, arrange them on pages with decorative elements, add
          captions or stickers, and create something that looks and feels handmade. The result is a physical album
          you can flip through, and the process itself is part of the appeal: choosing papers, layering textures,
          designing layouts.
        </p>
        <p>
          Scrapbooking works best when the goal is a curated visual record. The emphasis is on presentation: which
          photos to feature, how to arrange them, what colors and materials to use. It&rsquo;s a craft as much as a
          keepsake.
        </p>
        <p>
          <strong>Where scrapbooks shine:</strong>
        </p>
        <ul>
          <li>Visual impact. A well-made scrapbook is gorgeous and tactile.</li>
          <li>Creative expression. The design process is enjoyable in itself.</li>
          <li>Physical presence. It lives on a shelf, not in an app.</li>
        </ul>
        <p>
          <strong>Where scrapbooks fall short:</strong>
        </p>
        <ul>
          <li>
            Context fades. Without written sentences alongside the photos, you lose why a moment mattered. A photo
            of your dog on the couch is just a photo unless someone writes: &ldquo;The day she claimed that spot and
            never gave it back.&rdquo;
          </li>
          <li>
            Assembly barrier. Scrapbooking requires dedicated time, materials, and a workspace. Most scrapbook
            projects stall after the first few pages.
          </li>
          <li>
            Completeness bias. The pressure to make every page &ldquo;finished&rdquo; means ordinary moments get
            skipped in favor of photogenic ones.
          </li>
        </ul>

        <h2>What a memory book does</h2>
        <p>
          A memory book is a narrative project. The emphasis is on words: what happened, what it meant, who your pet
          was. Photos support the text, not the other way around. Memory books can be handwritten, typed, or
          generated from journal entries.
        </p>
        <p>
          Memory books work best when the goal is a record that captures personality, routines, and the story arc of
          a life, not just what it looked like.
        </p>
        <p>
          <strong>Where memory books shine:</strong>
        </p>
        <ul>
          <li>
            They preserve meaning. The things you&rsquo;ll want most in five years aren&rsquo;t the best-lit photos;
            they&rsquo;re the specific details that only existed in your memory.
          </li>
          <li>Low barrier. One sentence is a complete entry. No supplies needed.</li>
          <li>They capture the ordinary. A memory book entry about a boring Tuesday is often the most valuable page later.</li>
        </ul>
        <p>
          <strong>Where memory books fall short:</strong>
        </p>
        <ul>
          <li>No visual record on their own. Words without photos miss what your pet actually looked like at each stage.</li>
          <li>They require writing. If you strongly prefer visual projects, a blank page can feel heavy.</li>
        </ul>

        <h2>Creative page ideas that work in either format</h2>
        <p>Whether you&rsquo;re building a scrapbook or a memory book, these page concepts add depth:</p>
        <ul>
          <li>
            <strong>The origin page.</strong> How you found them, the first photo, the ride home. In a scrapbook,
            this is your opening layout. In a memory book, it&rsquo;s your first chapter.
          </li>
          <li>
            <strong>The nickname timeline.</strong> Every name they&rsquo;ve had, in chronological order, with the
            story behind each one. A scrapbook version uses fun typography. A memory book version reads like a list
            of inside jokes.
          </li>
          <li>
            <strong>The ordinary day.</strong> One completely normal day, documented hour by hour. Scrapbookers: use
            a grid of small photos from morning to night. Memory book writers: describe the routine in one
            paragraph.
          </li>
          <li>
            <strong>The trouble chapter.</strong> The disasters, told with love. The shoe incident, the trash
            catastrophe, the thing they destroyed that you&rsquo;ve somehow forgiven. In both formats, this is the
            page that makes people laugh.
          </li>
          <li>
            <strong>The seasonal portrait.</strong> The same spot, four times a year. Works identically in both
            formats and gets better every year.
          </li>
          <li>
            <strong>Then and now.</strong> A photo or description from the first weeks next to one from today. The
            gap tells the story.
          </li>
        </ul>
        <p>
          For more page ideas, the <a href="/blog/dog-memory-book-ideas">dog memory book ideas</a> article has twelve
          concepts, and the <a href="/blog/cat-memory-book">cat memory book guide</a> covers structures that work for
          quieter companions.
        </p>

        <h2>The real question: will you finish it?</h2>
        <p>
          The most important difference between the two isn&rsquo;t aesthetic. It&rsquo;s completion rate.
          Scrapbooks require a dedicated session to design each page. Memory books (especially digital ones) let you
          add a sentence on your phone in thirty seconds. The format you&rsquo;ll actually maintain beats the format
          you&rsquo;ll abandon after a burst of enthusiasm.
        </p>
        <p>
          If you love crafting and have a regular creative practice, a scrapbook will produce something stunning. If
          you want the lowest possible friction and you&rsquo;re more likely to type a sentence than cut a piece of
          cardstock, a memory book is the better path.
        </p>

        <h2>Combining both</h2>
        <p>
          The best version is both: the words and the photos, the meaning and the appearance. A few ways to do that:
        </p>
        <ul>
          <li>
            Start with a journal. Write the moments as they happen, then periodically pull the best entries into a
            scrapbook layout. The words come first; the design comes when you have time.
          </li>
          <li>
            Caption everything. If you&rsquo;re building a scrapbook, commit to one sentence per photo. That sentence
            is the memory book hiding inside your scrapbook.
          </li>
          <li>
            Use a tool that bridges the gap. The{" "}
            <a href="/blog/pet-journal-app-vs-photo-book">journal app vs photo book comparison</a> breaks down the
            trade-offs between writing-first and photos-first workflows.
          </li>
        </ul>
        <p>
          Everypaw sits at that intersection: you journal the daily moments in words, AI turns them into monthly
          story chapters, and those chapters become a printed hardcover book. It&rsquo;s the narrative depth of a
          memory book in a format you can hold.
        </p>

        <h2>Start with whatever is in front of you</h2>
        <p>
          Don&rsquo;t let the format decision become the reason you do nothing. If you have a stack of photos and a
          free afternoon, start a scrapbook. If you have your phone and thirty seconds, open a notes app and write
          one sentence about your pet right now. If you&rsquo;re not sure what to write, the{" "}
          <a href="/blog/pet-journal-prompts">pet journal prompts</a> list will get you past the blank page
          immediately.
        </p>
        <p>The format matters less than the habit. The habit matters less than starting.</p>
      </ArticleLayout>
    </>
  );
}
