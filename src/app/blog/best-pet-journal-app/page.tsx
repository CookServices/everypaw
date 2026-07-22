import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("best-pet-journal-app")!;
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
          If you search &ldquo;pet journal app&rdquo; on your phone&rsquo;s app store, you&rsquo;ll find two kinds
          of results that look similar but do completely different things. Understanding the difference before you
          download saves you from the most common disappointment: expecting memories and getting a medical log, or
          expecting health tracking and getting a scrapbook.
        </p>
        <p>
          Here&rsquo;s an honest look at what&rsquo;s out there in 2026, organized by what each type of app actually
          does, not by star ratings or feature counts.
        </p>

        <h2>The two kinds of &ldquo;pet journal&rdquo; app</h2>
        <p>The phrase &ldquo;pet journal&rdquo; covers two distinct intentions:</p>
        <p>
          <strong>Care tracking apps</strong> record what happened to your pet&rsquo;s body: vaccines, medications,
          weight, vet visits, feeding schedules, symptoms. They&rsquo;re built for health management and are
          closest to a medical chart.
        </p>
        <p>
          <strong>Memory journaling apps</strong> record what happened in your pet&rsquo;s life: the walks, the
          quirks, the milestones, the personality, the bond. They&rsquo;re built for storytelling and are closest to
          a diary or scrapbook.
        </p>
        <p>
          Most people searching for a &ldquo;pet journal&rdquo; want one of these, not both. The confusion happens
          because the apps themselves don&rsquo;t always make the distinction clear.
        </p>

        <h2>Care tracking apps</h2>

        <h3>DogNote</h3>
        <p>
          DogNote is probably the most established care tracking app for dogs. It handles weight logs, vaccination
          records, medication schedules, and vet appointment reminders. If you need a centralized health record for
          your dog, especially one you can share with a vet or a pet sitter, this is the category leader.
        </p>
        <p>
          What it doesn&rsquo;t do: DogNote isn&rsquo;t designed for memories, stories, or emotional journaling.
          There&rsquo;s no narrative output, no way to turn entries into a story or a book. If you want to record
          that your dog was afraid of umbrellas until last Tuesday, DogNote isn&rsquo;t the tool for that.
        </p>

        <h3>PetDesk</h3>
        <p>
          PetDesk connects directly with veterinary clinics, handling appointment booking, prescription refills, and
          medical records. It&rsquo;s less of a personal journal and more of a clinic-to-owner communication tool.
          Useful if your vet uses it, but not something you&rsquo;d open to write about your cat&rsquo;s opinion on
          the new couch.
        </p>

        <h3>Other care trackers</h3>
        <p>
          Several smaller apps (Pet Care, 11pets, PetPaw) cover similar ground with slight variations: some add food
          tracking, some track multiple pets well, some include growth charts. They&rsquo;re all built around the
          same core idea: your pet&rsquo;s health data in one place.
        </p>

        <h2>Memory journaling apps</h2>

        <h3>Everypaw</h3>
        <p>
          Full disclosure: this is the app behind this blog. Everypaw is built specifically for the memory side of
          pet journaling. You write short daily entries (one sentence is enough), and each month AI turns those
          entries into a narrative story chapter. At the end of the year, those chapters become a printed hardcover
          book.
        </p>
        <p>
          What it does well: the barrier to entry is very low (one sentence per day), and the AI story generation
          means you get something back from your entries without having to assemble anything yourself. The book
          output is the main differentiator: no other app in this space produces a physical printed product.
        </p>
        <p>
          What it doesn&rsquo;t do: Everypaw is not a health tracker. There&rsquo;s no vaccine log, no weight chart,
          no medication reminders. If you need medical records, you&rsquo;ll want a care tracking app alongside it.
          It also doesn&rsquo;t support photo-only entries; you need to write something, even if it&rsquo;s just a
          caption.
        </p>
        <p>
          For a deeper look at how to get the most out of any journaling habit, the{" "}
          <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> covers frequency, format,
          and how to write entries that hold up years later.
        </p>

        <h3>Voyage</h3>
        <p>
          Voyage is a pet-specific AI app that auto-generates diary-style entries from your pet&rsquo;s photos and
          daily activity, and layers in health-tracking features alongside the journal. It blurs the line between
          the two categories above: part memory journal, part care tracker.
        </p>
        <p>
          What it doesn&rsquo;t do: Voyage doesn&rsquo;t produce a physical printed book, and its AI generates
          entries mostly from photos and activity data rather than from your own words, which means less of the
          specific, personal detail that comes from writing an entry yourself.
        </p>

        <h3>Notes apps (the free option)</h3>
        <p>
          Apple Notes, Google Keep, a physical notebook. Genuinely viable for pet journaling, especially if the main
          thing you need is a place to write a sentence a day. The advantage is zero friction: you already have it,
          it&rsquo;s free, and there&rsquo;s no learning curve.
        </p>
        <p>
          The disadvantage is that notes apps don&rsquo;t do anything with your entries. There&rsquo;s no story
          generation, no book output, no monthly chapters. After a year, you have a long list of notes that
          you&rsquo;ll need to organize and format yourself if you ever want to turn them into something. If you
          need prompts to get started, the <a href="/blog/pet-journal-prompts">50 pet journal prompts</a> list works
          in any app.
        </p>

        <h2>How to choose</h2>
        <p>The decision comes down to what you want to end up with:</p>
        <ul>
          <li>
            If you want <strong>health records</strong>: pick a care tracking app (DogNote for dogs, PetDesk if
            your vet uses it).
          </li>
          <li>
            If you want <strong>a written record of memories</strong> and you&rsquo;re disciplined enough to
            organize them later: a notes app is free and works.
          </li>
          <li>
            If you want <strong>memories turned into stories and a printed book</strong> without doing the assembly
            yourself: that&rsquo;s what Everypaw is built for.
          </li>
          <li>
            If you want <strong>both health tracking and memories</strong>: an app like Voyage attempts both in one
            place, though most single apps that try to do both end up doing neither as deeply as a dedicated tool.
          </li>
        </ul>
        <p>
          The most important thing is less about which app you pick and more about whether you actually use it. A
          notes app used daily beats a premium app opened once. If you want to explore what&rsquo;s worth writing
          about before committing to any tool, start with the{" "}
          <a href="/blog/write-your-pets-life-story">guide to writing your pet&rsquo;s life story</a>. The method
          matters more than the medium.
        </p>
      </ArticleLayout>
    </>
  );
}
