import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("gotcha-day-ideas")!;
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
          A gotcha day is the anniversary of the day your pet came home. For adopted and rescued pets, it&rsquo;s
          often the only &ldquo;birthday&rdquo; you have, since the actual birth date is unknown or approximate. But
          even if you know the birthday, the gotcha day marks something different: the day you chose each other.
        </p>
        <p>
          Here are ten ways to celebrate it, from the simple to the sentimental, plus the one gotcha day habit that
          turns a celebration into something you&rsquo;ll keep forever.
        </p>

        <h2>1. Recreate the first photo</h2>
        <p>
          Find the earliest photo you have of them and recreate it: same spot, same angle, same pose if they&rsquo;ll
          cooperate. Put the two photos side by side. The contrast is always more dramatic than you expect,
          especially after the first year. If you&rsquo;ve been doing this annually, you already have a series worth
          framing.
        </p>

        <h2>2. Revisit where you met</h2>
        <p>
          Go back to the shelter, the breeder, the parking lot where the handoff happened, or the friend&rsquo;s
          house where you first saw them. If you can, bring them. If the place is too far or no longer there, look at
          it on a map together (they won&rsquo;t care, but you will) and write down what you remember about that day
          while the return makes it vivid.
        </p>

        <h2>3. The gotcha day outing</h2>
        <p>
          Take them somewhere special: their favorite trail, a beach they love, a park they&rsquo;ve never been to.
          Let them lead. The point isn&rsquo;t the destination; it&rsquo;s giving them a day shaped around what they
          enjoy, not what you need to get done.
        </p>

        <h2>4. A new version of their first toy</h2>
        <p>
          If you remember their first toy (or the first one they chose), find the same one or the closest thing to
          it. Watching them react to a toy that&rsquo;s both new and familiar is its own kind of time travel.
        </p>

        <h2>5. The gotcha day portrait</h2>
        <p>
          One deliberate photo, taken on the same day each year. Not a selfie (though those are fine too): a photo
          that shows who they are right now. Frame it or add it to a collection. After three or four years, the
          series becomes one of the most valuable things you own.
        </p>

        <h2>6. The annual letter</h2>
        <p>
          Write them a short letter: what happened this year, what changed, what stayed the same, one thing
          you&rsquo;re grateful for. You don&rsquo;t have to show it to anyone. Date it and save it somewhere you
          won&rsquo;t lose it. These letters quietly become a journal of your own life, told through theirs.
        </p>

        <h2>7. A special meal</h2>
        <p>
          Let them have the thing they always want and almost never get. The good treats, the long-forbidden table
          scrap, the fancy wet food they got once at the vet and never forgot. One day a year, the rules bend.
          They&rsquo;ll remember it (and so will you).
        </p>

        <h2>8. A donation in their name</h2>
        <p>
          Give to the shelter or rescue they came from, or to any animal organization you care about. It doesn&rsquo;t
          have to be large. If you can, make it the same amount each year, tied to the gotcha day. The donation
          becomes part of the tradition.
        </p>

        <h2>9. Share the story</h2>
        <p>
          Post it, tell it at dinner, text it to the friend who was there. The story of how you got your pet is one
          of the best stories you have, and gotcha day is the natural time to tell it. Include the parts you usually
          skip: the doubt, the logistics, the moment it stopped being a decision and started being obvious.
        </p>

        <h2>10. Invite their people</h2>
        <p>
          If your pet has a best friend (human or animal), include them. A gotcha day &ldquo;party&rdquo; can be as
          simple as a walk with the neighbor&rsquo;s dog who they&rsquo;ve played with since week one, or a visit
          from the person who fostered them. The relationships matter as much as the milestones.
        </p>

        <h2>The habit that makes it last</h2>
        <p>
          All of these ideas create moments. But moments fade unless you write them down. The gotcha day tradition
          that ages best is the simplest: after the outing, the treat, or the photo, sit down and write a few
          sentences about how the day went and how your pet is different from a year ago.
        </p>
        <p>
          If you keep a pet journal, gotcha day entries become the spine of the whole collection. The{" "}
          <a href="/blog/pet-journal-prompts">pet journal prompts</a> list has questions designed for exactly these
          reflective moments (try prompt 30: &ldquo;How did you celebrate their last birthday or gotcha
          day?&rdquo;). And if you&rsquo;re building a <a href="/blog/dog-memory-book-ideas">dog memory book</a> or{" "}
          <a href="/blog/cat-memory-book">cat memory book</a>, the annual gotcha day photo and letter are two of the
          strongest pages you can include.
        </p>
        <p>
          Everypaw marks gotcha days automatically and sends you a reminder, so the tradition doesn&rsquo;t depend on
          your memory. But however you do it, the key is consistency. One photo, one paragraph, once a year. After
          five years, you&rsquo;ll have something no amount of camera roll scrolling could replicate.
        </p>
      </ArticleLayout>
    </>
  );
}
