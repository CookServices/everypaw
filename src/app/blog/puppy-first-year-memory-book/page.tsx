import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost } from "@/lib/blog";

const post = getPost("puppy-first-year-memory-book")!;

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
          A puppy&rsquo;s first year is twelve months of firsts stacked so close together that you can&rsquo;t see the
          changes while they&rsquo;re happening. The paws stop being too big. The nights get quieter. The chewing stops.
          Eventually. And because you&rsquo;re there every single day, your memory smooths it all out. That&rsquo;s why so
          many owners look at month-two photos a year later and think: I&rsquo;d already forgotten they were ever this
          small.
        </p>
        <p>
          A first year memory book is how you keep the versions of them that only existed for a few weeks at a time.
          Here&rsquo;s a month-by-month guide to what&rsquo;s worth capturing, what to write down, and how to turn all of
          it into a real book at the end.
        </p>

        <h2>Before they even come home</h2>
        <p>
          This guide focuses on puppies, but if you just brought home a kitten, the same month-by-month approach applies.
          The <a href="/blog/cat-memory-book">cat memory book guide</a> covers what&rsquo;s different about capturing a
          cat&rsquo;s first year.
        </p>
        <p>The book starts before the puppy does. Capture, while it&rsquo;s still fresh:</p>
        <ul>
          <li>The day you decided. What tipped it: the conversation, the photo, the visit?</li>
          <li>How you found them: the litter, the shelter listing, the friend of a friend.</li>
          <li>The photo that sealed the decision.</li>
          <li>The ride home: who held them, whether they cried or slept, what you talked about.</li>
          <li>The shortlist of names that lost, and why.</li>
        </ul>

        <h2>Months 1-2: the landing</h2>
        <p>
          Everything is a first right now, which paradoxically makes it the easiest period to under-document:
          you&rsquo;re too busy living it.
        </p>
        <ul>
          <li>
            Write about the first night honestly, sleepless parts included. Those become the best pages later.
          </li>
          <li>
            The first vet visit, and the weight. Write the number down; you&rsquo;ll want the comparison at month
            twelve.
          </li>
          <li>The name story: what you almost called them, and who vetoed it.</li>
          <li>
            Where they sleep versus where they&rsquo;re &ldquo;supposed&rdquo; to sleep, and how long the official
            policy lasted.
          </li>
        </ul>

        <h2>Months 3-4: the world opens up</h2>
        <ul>
          <li>The first walks on a leash. (Spoiler: not walks yet. Describe what they actually were.)</li>
          <li>First encounters: other dogs, kids, stairs, rain, the vacuum.</li>
          <li>
            The teething casualties: keep a list of the losses (shoes, chair legs, one corner of one very specific rug)
            and photograph the evidence. It&rsquo;s funny later, promise.
          </li>
          <li>The first cue that clicked, and the exact treat that made it happen.</li>
        </ul>

        <h2>Months 5-6: half grown, fully chaotic</h2>
        <ul>
          <li>
            Growth is visible almost week to week now; this is the golden window for the size-record photos described
            below.
          </li>
          <li>
            Adolescence knocks: selective hearing begins. Write down exactly what they &ldquo;forgot&rdquo; and when.
          </li>
          <li>The day the bed or crate officially got too small.</li>
          <li>New sounds: the day the squeaky puppy noise became a real bark.</li>
        </ul>

        <h2>Months 7-9: the personality locks in</h2>
        <ul>
          <li>
            The quirks appearing now are largely your adult dog&rsquo;s quirks. Note them as they form: the couch
            position, the greeting ritual, the opinion about the mail.
          </li>
          <li>The routines they invented, not you.</li>
          <li>Training wins, and the negotiations that remain open.</li>
          <li>Their first change of season: first snow, first heatwave, first pile of leaves.</li>
        </ul>

        <h2>Months 10-12: almost grown</h2>
        <ul>
          <li>
            Calmer moments start to appear. Record the first time they lay next to you through an entire movie.
          </li>
          <li>Then-and-now: recreate two or three photos from the first weeks, same spot, same angle.</li>
          <li>The first birthday: how you marked it, what they got, who came.</li>
          <li>
            A short letter to them at one year old. You&rsquo;ll write another at two, and be glad you started.
          </li>
        </ul>

        <h2>Photo ideas that age well</h2>
        <ul>
          <li>
            The same spot, every month. Pick one place in your home, same angle, twelve photos. This series alone
            justifies the whole project.
          </li>
          <li>
            A fixed-size reference. Photograph them monthly next to the same toy or object. Watching the toy
            &ldquo;shrink&rdquo; is the clearest record of growth you can make.
          </li>
          <li>Their paw in your hand, month one and month twelve.</li>
          <li>The sleep chronicles. Positions evolve dramatically over a first year. Document generously.</li>
          <li>Keep the imperfect shots. Blur means motion, and motion means puppy.</li>
        </ul>

        <h2>What to write when &ldquo;nothing happened&rdquo;</h2>
        <p>
          Most days of a first year aren&rsquo;t milestones, but &ldquo;an ordinary day at five months old&rdquo; is
          exactly the page you can never recreate later. One sentence is enough: what they did while you cooked, the
          sound they made at the window, how they asked to play. If you&rsquo;re stuck, keep a list of{" "}
          <a href="/blog/pet-journal-prompts">pet journal prompts</a> handy, and borrow page structures from these{" "}
          <a href="/blog/dog-memory-book-ideas">dog memory book ideas</a>.
        </p>

        <h2>Turning twelve months into a real book</h2>
        <p>
          Here&rsquo;s the classic failure mode: hundreds of photos, zero notes, and a &ldquo;someday&rdquo; assembly
          project that never happens. The way around it is to build the book as you go, a sentence or two per moment,
          written when it happens, so that by the first birthday the story already exists and only needs printing. For
          the general principles behind consistent journaling, the{" "}
          <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> covers how to write entries that
          age well beyond the first year.
        </p>
        <p>
          That&rsquo;s exactly what Everypaw is built for: you journal the small moments, AI turns them into monthly
          story chapters, and the first year becomes a printed hardcover book you can actually put on a shelf. But book
          or no book, write tonight&rsquo;s entry. The small version of them is already on their way out the door.
        </p>
      </ArticleLayout>
    </>
  );
}
