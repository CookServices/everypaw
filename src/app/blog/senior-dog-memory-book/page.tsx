import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("senior-dog-memory-book")!;
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
          There&rsquo;s a version of your dog that only exists right now: the gray muzzle, the slower stairs, the
          deeper sighs, the look they give you from across the room that they never gave when they were young because
          they were too busy being young. This version is quieter, and it&rsquo;s the one you&rsquo;ll miss in ways
          you can&rsquo;t predict.
        </p>
        <p>
          A senior dog memory book isn&rsquo;t about preparing for the end. It&rsquo;s about paying attention to who
          they are right now, while right now is still happening. Here&rsquo;s what to capture, how to capture it,
          and why the ordinary days matter more in this chapter than in any other.
        </p>

        <h2>Why the senior years are the hardest to document</h2>
        <p>
          When your dog was a puppy, everything was a first. The milestones were obvious, the changes were visible
          week to week, and you were probably taking ten photos a day. The senior years are the opposite: the
          changes are slow, the days look alike, and the camera stays in your pocket because nothing seems to be
          happening.
        </p>
        <p>
          But something is happening. The nap spot has moved closer to you. The walk has shortened by a block. The
          greeting at the door is the same enthusiasm with less jumping. These shifts are the story of your dog
          settling into the deepest version of themselves, and they&rsquo;re exactly the things that disappear from
          memory first.
        </p>

        <h2>What to write about</h2>

        <h3>The routine as it is now</h3>
        <p>
          Map a typical day, hour by hour. Where they sleep in the morning. How long before they ask to go out. The
          pace of the walk. What they do with the afternoon. How early they settle for the night. Do this once, then
          again in six months. The comparison will surprise you, and both versions will matter.
        </p>

        <h3>What hasn&rsquo;t changed</h3>
        <p>
          The thing they still do exactly the way they did at two years old: the tail wag at the treat bag, the
          specific bark at the mail, the way they position themselves on the couch. These surviving habits are the
          thread between the puppy and the senior, and writing them down is how you keep the thread visible.
        </p>

        <h3>The new tenderness</h3>
        <p>
          Senior dogs develop a kind of gentleness that younger dogs don&rsquo;t have. The slower lean against your
          leg. The way they watch you leave a room. The longer eye contact. This isn&rsquo;t decline; it&rsquo;s
          depth. Write about it like what it is.
        </p>

        <h3>The accommodations</h3>
        <p>
          The ramp you built for the bed. The shorter walks. The softer food. The way you now carry them up the
          stairs you used to race them up. These adaptations are acts of love, and they belong in the book as much
          as any milestone.
        </p>

        <h3>The vet chapters</h3>
        <p>
          Write about the vet visits. Not the medical details (that&rsquo;s for the chart), but how they handled it,
          how you handled it, what the vet said that you want to remember, and the car ride home. These entries are
          hard to write. They&rsquo;re among the most valuable ones you&rsquo;ll have.
        </p>

        <h2>Photos that capture this chapter</h2>
        <ul>
          <li>
            <strong>The sleeping portraits.</strong> Senior dogs sleep more, and they sleep more peacefully.
            Photograph them at rest. These photos feel unremarkable now and irreplaceable later.
          </li>
          <li>
            <strong>The gray.</strong> The muzzle, the eyebrows, the paws. Photograph the gray intentionally, in
            good light. It&rsquo;s beautiful, and you&rsquo;ll want to see it again.
          </li>
          <li>
            <strong>The walk, at their pace.</strong> Have someone photograph you walking together, from behind. The
            pace, the closeness, the leash slack: it tells the whole story.
          </li>
          <li>
            <strong>Then and now.</strong> If you have photos from the same spot taken years ago, recreate them.
            Same angle, same place. The pair says what words can&rsquo;t.
          </li>
          <li>
            <strong>The spot.</strong> Whatever their main spot is right now (the bed, the rug, the corner of the
            couch), photograph it with them in it and without. Both versions matter.
          </li>
        </ul>

        <h2>How to structure the book</h2>
        <p>A senior dog memory book doesn&rsquo;t need a chronological structure. The golden years work better organized by theme:</p>
        <ul>
          <li>
            <strong>A chapter on routines.</strong> The current daily rhythm, documented with love.
          </li>
          <li>
            <strong>A chapter on history.</strong> The abbreviated story of their life so far: where they came from,
            the homes they&rsquo;ve known, the people they&rsquo;ve loved. If you need help pulling this together,
            the guide to <a href="/blog/write-your-pets-life-story">writing your pet&rsquo;s life story</a> has a
            framework that works well for retrospective writing.
          </li>
          <li>
            <strong>A chapter on personality.</strong> Who they are, fully formed. The{" "}
            <a href="/blog/pet-journal-prompts">pet journal prompts</a> list (especially prompts 11 through 20, on
            personality and quirks) is useful here.
          </li>
          <li>
            <strong>A chapter on the bond.</strong> What they mean to you, what they&rsquo;ve changed about you, what
            you say to them when no one is around. The prompts on &ldquo;your bond&rdquo; (31 through 40) cover this
            territory.
          </li>
          <li>
            <strong>Letters.</strong> One per year, or one per season. Whatever frequency you can maintain.
          </li>
        </ul>
        <p>
          For broader page ideas, the <a href="/blog/dog-memory-book-ideas">dog memory book ideas</a> article has
          structures (the nickname timeline, the map of their world, the trouble chapter) that work for any age.
        </p>

        <h2>Start with today, not with the past</h2>
        <p>
          The temptation is to begin by trying to reconstruct everything that came before. Resist it. Start with
          today. Write about who they are right now. Photograph them this afternoon. Record the walk tonight.
        </p>
        <p>
          You can fill in the earlier chapters later, from memory, from old photos, from the people who knew them.
          But the senior version, the one in front of you right now, can only be captured in real time.
        </p>
        <p>
          If you&rsquo;re not already journaling, the{" "}
          <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> has everything you need to
          start a sustainable habit: how often, how much, what format. Everypaw handles the rest: you write the
          entries, AI turns them into monthly story chapters, and those chapters become a printed hardcover book. But
          the book is secondary. The writing is what matters. One sentence about today&rsquo;s walk, while you still
          have today&rsquo;s walk.
        </p>
        <p>
          And when the time comes, if it helps, the{" "}
          <a href="/blog/pet-loss-keepsake-ideas">pet loss keepsake ideas</a> article is there. But that&rsquo;s for
          later. Today is for the gray muzzle and the slow stairs and the deep sigh next to you on the couch. Write
          that down.
        </p>
      </ArticleLayout>
    </>
  );
}
