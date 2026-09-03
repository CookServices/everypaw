import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("gifts-for-pet-parents")!;
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
          The pet parent in your life already has the leash, the bed, the matching bandana, and three versions of
          the same treat pouch. They don&rsquo;t need more stuff. What they don&rsquo;t have, almost certainly, is a
          way to keep the memories of their pet organized, written down, and safe from the slow fade of time.
        </p>
        <p>
          That&rsquo;s the gap this list fills. Eleven gift ideas that aren&rsquo;t another toy or accessory,
          organized into three categories: things that capture their pet&rsquo;s story, things that honor the bond,
          and a few experiences that create new memories worth recording.
        </p>

        <h2>Gifts that capture the story</h2>

        <h3>1. A pet memory journal</h3>
        <p>
          A dedicated journal for writing about their pet, with prompts or blank pages. This works especially well
          for people who already take hundreds of photos but never write down the context. The journal turns
          &ldquo;cute photo&rdquo; into &ldquo;cute photo plus the story of why it mattered.&rdquo; If you want to
          include a starting point, print out a few <a href="/blog/pet-journal-prompts">pet journal prompts</a> and
          tuck them inside the cover.
        </p>

        <h3>2. A memory book kit</h3>
        <p>
          Give them the pieces to build a <a href="/blog/dog-memory-book-ideas">dog memory book</a> or{" "}
          <a href="/blog/cat-memory-book">cat memory book</a>: a nice photo printer, a set of archival-quality pens,
          and a blank hardcover album. The key is pairing it with a note that says &ldquo;for the stories behind the
          photos, not just the photos.&rdquo; Without that nudge, it becomes another empty album.
        </p>

        <h3>3. A pet journal subscription</h3>
        <p>
          A subscription to a pet journaling app that turns daily notes into something lasting. Everypaw, for
          example, takes one-sentence entries and turns them into monthly AI-generated story chapters, then a
          printed hardcover book at the end of the year. It&rsquo;s a gift that builds over twelve months rather
          than sitting on a shelf after one use. You can{" "}
          <a href="/gift">give a year of Everypaw</a> directly: the recipient gets a code, and orders their
          printed book once their journal holds a year worth keeping.
        </p>

        <h3>4. A custom photo book from their camera roll</h3>
        <p>
          Offer to help them assemble one. The reason most pet photo books never get made isn&rsquo;t lack of
          photos: it&rsquo;s the assembly project. Volunteer an afternoon to sit with them, pick the best fifty
          photos, add captions, and order a print. The labor is the gift.
        </p>

        <h3>5. A &ldquo;first year&rdquo; or &ldquo;senior years&rdquo; memory book</h3>
        <p>
          If they have a puppy or kitten, a first-year memory book (structured{" "}
          <a href="/blog/puppy-first-year-memory-book">month by month for puppies</a> or{" "}
          <a href="/blog/kitten-first-year-memory-book">kittens</a>) is a gift with a built-in timeline. For older
          pets, the same structure works in reverse: capture the slower walks, the grayer muzzle, the routines that
          have deepened over years.
        </p>

        <h2>Gifts that honor the bond</h2>

        <h3>6. A portrait from a photo they love</h3>
        <p>
          Commission an artist (local or online) to turn their favorite photo into a painting, drawing, or digital
          illustration. The important part: ask which photo is their favorite, or quietly find out from someone who
          would know. A generic &ldquo;cute pose&rdquo; portrait is nice. Their specific favorite moment, rendered
          in a new medium, is a keepsake.
        </p>

        <h3>7. A donation to their pet&rsquo;s rescue or shelter</h3>
        <p>
          If you know where their pet came from, make a donation in the pet&rsquo;s name. If you don&rsquo;t know
          the origin, a local shelter or breed rescue works. Include a note: &ldquo;A donation to [organization] in
          [pet&rsquo;s name]&rsquo;s honor.&rdquo; The amount doesn&rsquo;t matter. The specificity does.
        </p>

        <h3>8. A memorial keepsake (for someone who has lost a pet)</h3>
        <p>
          This one requires sensitivity and timing. If someone in your life has recently lost a pet, a thoughtful{" "}
          <a href="/blog/pet-memorial-gifts">pet memorial gift</a> can mean more than anything else on this list. A
          framed photo you took yourself, a letter with a real memory, or a <a href="/memorial">memorial page</a>{" "}
          they can fill when they&rsquo;re ready. The{" "}
          <a href="/blog/pet-loss-keepsake-ideas">pet loss keepsake ideas</a> article has more options, including a
          few that cost nothing.
        </p>

        <h2>Gifts that create new memories</h2>

        <h3>9. An experience together with their pet</h3>
        <p>
          A day trip to a dog-friendly beach, a hike they haven&rsquo;t tried, a reservation at a pet-friendly
          restaurant. Experiences create stories, and stories are what fill the journal. If you want to go further,
          photograph the day for them so they have photos from an angle they never see: themselves with their pet.
        </p>

        <h3>10. A professional photo session</h3>
        <p>
          Not the posed studio kind (unless that&rsquo;s their style). Book a photographer who does candid sessions
          at a park, beach, or home. The resulting photos, with dates and context attached, become the raw material
          for a memory book they&rsquo;ll actually treasure.
        </p>

        <h3>11. A letter from you about their pet</h3>
        <p>
          Write them a letter about their pet, from your perspective. What you&rsquo;ve noticed about the
          relationship, the time their dog greeted you in a way that made you understand why people cry about their
          pets, the way their cat ignores everyone but tolerates you. This costs nothing and is almost impossible to
          throw away.
        </p>

        <h2>The principle behind all of these</h2>
        <p>
          The best gift for a pet parent isn&rsquo;t something for the pet. It&rsquo;s something that helps the pet
          parent hold on to the story: the context behind the photos, the personality behind the routines, the
          moments that only feel ordinary until they&rsquo;re gone.
        </p>
        <p>
          Whatever you choose, include a handwritten note. Say the pet&rsquo;s name. Mention a specific memory. That
          sentence is worth more than the gift itself.
        </p>
      </ArticleLayout>
    </>
  );
}
