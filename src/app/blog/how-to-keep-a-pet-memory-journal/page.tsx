import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("how-to-keep-a-pet-memory-journal")!;
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
          You take photos. You post stories. You tell friends the funny thing your dog did this morning. And within a
          few weeks, the details blur: was it Tuesday or Thursday? Was it the red ball or the rope? Did she bark at the
          squirrel or just freeze?
        </p>
        <p>
          A pet memory journal is how you stop that blur. Not a medical log, not a training tracker, not a polished
          diary. Just a place where you write down the small, specific, forgettable moments before they become
          unfindable. Here&rsquo;s how to start one, how to keep it going, and why the ordinary entries end up mattering
          more than the milestones.
        </p>

        <h2>What a pet memory journal actually is</h2>
        <p>
          It&rsquo;s not what most people picture. You don&rsquo;t need a leather notebook. You don&rsquo;t need to write
          every day. You don&rsquo;t need paragraphs.
        </p>
        <p>
          A pet memory journal is any consistent habit of recording moments about your pet in words. One sentence
          counts. A photo caption counts. Three words after a vet visit count. The only thing that doesn&rsquo;t count is
          &ldquo;I&rsquo;ll remember this,&rdquo; because you won&rsquo;t.
        </p>
        <p>
          What separates a memory journal from a care log is intent. A care log tracks what happened (vaccines, weight,
          medications). A memory journal captures what it felt like: the way they tilted their head, the sound they made
          when you opened the treat bag, the afternoon they refused to leave the park. Care data has utility. Memory data
          has meaning.
        </p>

        <h2>What to write about</h2>
        <p>
          The instinct is to wait for something big: a milestone, a trip, a first. But the entries you&rsquo;ll reread
          most are the ordinary ones, the ones that capture a version of your pet that only existed for a few weeks.
        </p>
        <p>A few categories that work well:</p>
        <ul>
          <li>
            <strong>Daily snapshots.</strong> What they did today, in one sentence. &ldquo;Slept under the desk all
            morning, then stole a sock at 4pm.&rdquo;
          </li>
          <li>
            <strong>Personality notes.</strong> Quirks, preferences, fears, routines. These shift over time, and you
            won&rsquo;t notice until you read back.
          </li>
          <li>
            <strong>Relationship moments.</strong> How they greeted someone, how they reacted to a new dog, how they
            curled up next to you during a storm.
          </li>
          <li>
            <strong>The hard stuff.</strong> Vet visits, aging, illness. These are the entries people are most grateful
            they wrote.
          </li>
        </ul>
        <p>
          If you&rsquo;re stuck on what to write, a list of{" "}
          <a href="/blog/pet-journal-prompts">50 pet journal prompts</a> can get you past the blank page in seconds.
        </p>

        <h2>How often to write</h2>
        <p>
          The honest answer: as often as you actually will, not as often as you think you should.
        </p>
        <p>
          Three entries a week is plenty. One entry a week still builds a rich record over a year. The trap is setting a
          daily target, missing three days, feeling guilty, and quitting. A pet journal that gets five entries a month
          for two years beats one that gets thirty entries in January and nothing after.
        </p>
        <p>
          The sustainable approach is to attach journaling to something you already do: after the evening walk, while
          they eat dinner, right before bed. The trigger matters more than the schedule.
        </p>

        <h2>How to write entries that age well</h2>
        <p>
          A few principles that separate entries you&rsquo;ll treasure from ones you&rsquo;ll skim:
        </p>
        <ul>
          <li>
            <strong>Be specific, not poetic.</strong> &ldquo;He sat on the rug staring at the dishwasher for ten
            minutes&rdquo; beats &ldquo;Another funny day with my boy.&rdquo; Precision is what future-you needs.
          </li>
          <li>
            <strong>Name the date.</strong> &ldquo;March 2027&rdquo; is useful. &ldquo;Today&rdquo; is not, once
            you&rsquo;re reading it a year later. Even just the month and year transforms a note into a time capsule.
          </li>
          <li>
            <strong>Include context your future self won&rsquo;t have.</strong> Your current apartment, the
            neighbor&rsquo;s dog they play with, the brand of food they&rsquo;re obsessed with this month. These details
            disappear without a trace.
          </li>
          <li>
            <strong>Keep it short.</strong> One to three sentences is ideal. If writing more feels natural, go for it.
            But never let length become the bar, or you&rsquo;ll stop writing.
          </li>
        </ul>

        <h2>Dogs, cats, and every other pet</h2>
        <p>
          Most pet journal advice leans heavily toward dogs, because dogs have visible routines, walks, and social lives
          that produce obvious material. But cats are just as journalable: they just require a different eye. The quiet
          moments, the spot they chose this week, the 3am zoomies, the slow blink from across the room. If you have a
          cat, the <a href="/blog/cat-memory-book">cat memory book guide</a> covers what&rsquo;s worth capturing and how
          to notice it.
        </p>
        <p>
          The same principles apply to rabbits, birds, horses, or any animal you share life with. If you&rsquo;d miss
          them, their story is worth writing down.
        </p>

        <h2>Special chapters: the first year and the last</h2>
        <p>
          Two periods in a pet&rsquo;s life produce the densest material: the beginning and the end.
        </p>
        <p>
          A puppy or kitten&rsquo;s first year changes so fast that monthly entries feel like time-lapse photography. If
          you&rsquo;re in that window right now, a{" "}
          <a href="/blog/puppy-first-year-memory-book">month-by-month first year guide</a> can help you structure the
          chaos before it&rsquo;s behind you.
        </p>
        <p>
          The harder chapter is aging, illness, and loss. These entries are the most painful to write and the most
          valuable to have. They don&rsquo;t need to be long. &ldquo;Slower on the stairs today, but still wagged at the
          mailman&rdquo; is enough. And if you&rsquo;re journaling after a loss, or looking for ways to honor a pet
          who&rsquo;s gone, there are <a href="/blog/pet-loss-keepsake-ideas">keepsake ideas</a> and a{" "}
          <a href="/memorial">memorial page</a> designed for exactly that.
        </p>

        <h2>From journal to book</h2>
        <p>
          The question people eventually ask is: what do I do with all of this?
        </p>
        <p>
          One option is nothing. A journal is valuable on its own, even if no one ever reads it but you. But if you want
          to turn it into something tangible, the easiest path is the one where the book builds itself as you go, rather
          than requiring a separate assembly project months later.
        </p>
        <p>
          That&rsquo;s the core idea behind Everypaw: you write the small moments, AI turns them into monthly story
          chapters, and at the end of the year those chapters become a printed hardcover book. If you want to see what a
          finished version looks like, these <a href="/blog/dog-memory-book-ideas">dog memory book ideas</a> show the
          kinds of pages that emerge from consistent journaling.
        </p>
        <p>
          If you&rsquo;re not sure which tool fits your style, the{" "}
          <a href="/blog/best-pet-journal-app">comparison of pet journal apps</a> breaks down what each type does and
          doesn&rsquo;t do. And if you&rsquo;re deciding between a journal app and a photo book service, here&rsquo;s a{" "}
          <a href="/blog/pet-journal-app-vs-photo-book">side-by-side look at what each one captures</a>.
        </p>

        <h2>Start tonight</h2>
        <p>
          The best pet memory journal is the one that exists. Open your notes app, or a notebook, or Everypaw, and write
          one sentence about your pet right now. Not tomorrow. Not when something interesting happens. Right now, while
          the ordinary moment in front of you is still ordinary enough to forget.
        </p>
      </ArticleLayout>
    </>
  );
}
