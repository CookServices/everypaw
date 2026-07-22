import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("kitten-first-year-memory-book")!;
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
          Kittens grow up faster than puppies, and they do it more quietly. There are no training classes, no
          neighborhood walks, no gradual leash introductions. A kitten arrives, claims a corner of the apartment, and
          within three months has a fully operational personality that they&rsquo;ll spend the next fifteen years
          refining.
        </p>
        <p>
          That speed is exactly why a first year memory book matters. The tiny version of your cat, the one who fit in
          your hand and attacked your shoelaces and slept in places that made no structural sense, only exists for a
          few months. Here&rsquo;s what to capture, month by month, before it all blurs together.
        </p>

        <h2>Before they come home</h2>
        <p>The story starts before the kitten does. Write down, while it&rsquo;s fresh:</p>
        <ul>
          <li>How you decided on a cat (and not, say, a sensible plant).</li>
          <li>
            How you found this particular kitten: the shelter visit, the litter photo, the friend whose cat had
            kittens.
          </li>
          <li>The name story. What made the shortlist, what got vetoed, and how the winner emerged.</li>
          <li>What you bought or prepared before they arrived, and how much of it turned out to be irrelevant.</li>
        </ul>

        <h2>Months 1-2: the arrival</h2>
        <p>Everything is happening at once, and you&rsquo;re simultaneously exhausted and enchanted.</p>
        <ul>
          <li>
            Write about the first night. Where they slept (not where you planned for them to sleep). Whether either
            of you actually slept.
          </li>
          <li>
            The first hiding spot. Kittens pick a base of operations within hours. Document it; they&rsquo;ll
            abandon it within weeks and you&rsquo;ll forget which shelf it was.
          </li>
          <li>Their first weight at the vet. Write the number down. The contrast at month twelve is remarkable.</li>
          <li>Early food preferences: what they loved, what they rejected, what they tried to steal.</li>
          <li>The first toy they bonded with, and how long it survived.</li>
        </ul>

        <h2>Months 3-4: the exploration phase</h2>
        <p>The kitten has decided the apartment belongs to them. Now they&rsquo;re auditing it.</p>
        <ul>
          <li>
            New rooms, new heights, new forbidden surfaces. Keep a list of the places they discovered and claimed.
            Photographs of a kitten on top of the refrigerator for the first time are priceless.
          </li>
          <li>
            The first encounter with whatever else lives in the household: another cat, a dog, a houseplant they
            immediately tried to eat.
          </li>
          <li>
            The beginning of the zoomies era. Note the time of day, the typical circuit, and the face they make at
            full speed.
          </li>
          <li>Their relationship with windows. Cats and windows is a lifelong affair, and it starts here.</li>
        </ul>

        <h2>Months 5-6: personality takes shape</h2>
        <p>
          The kitten is becoming a cat, and the quirks forming now are the quirks you&rsquo;ll describe to people for
          the next decade.
        </p>
        <ul>
          <li>
            The first real &ldquo;conversation&rdquo;: the meow they reserve for you, different from the one aimed at
            the door or the food bowl.
          </li>
          <li>Sleeping positions. They&rsquo;re getting stranger as the kitten gets bigger. Document generously.</li>
          <li>The hunt instinct in full swing: what they stalk, what they catch, what they bring you as a gift.</li>
          <li>
            The first time they sat on your lap for more than thirty seconds and you didn&rsquo;t dare move.
          </li>
        </ul>

        <h2>Months 7-9: settling in</h2>
        <p>The chaos is dialing down, slightly. Routines are solidifying.</p>
        <ul>
          <li>
            Their daily schedule, mapped out. Where they are at 8am, noon, 6pm, midnight. Cats are creatures of
            extreme routine, and the first year is when the schedule locks.
          </li>
          <li>
            The spot. Every cat eventually commits to one primary napping location. When it happens, record it.
          </li>
          <li>Relationship dynamics: who in the household they follow, who they ignore, who gets the slow blink.</li>
          <li>
            Grooming habits: how they wash, where they leave fur, the specific surface they&rsquo;ve chosen to
            scratch despite every alternative you&rsquo;ve offered.
          </li>
        </ul>

        <h2>Months 10-12: almost grown</h2>
        <ul>
          <li>The first birthday or adoption anniversary. How you marked it, and whether they cared.</li>
          <li>
            Then-and-now: recreate a photo from the first weeks, same spot, same angle. The size difference tells the
            whole story.
          </li>
          <li>
            A letter to them at one year old. What you know about them now that you didn&rsquo;t know at month two.
            What surprised you. What you hope stays the same.
          </li>
          <li>
            The kitten thing they still do: the one behavior that hasn&rsquo;t changed, the reminder that they were
            once small enough to fit in a shoe.
          </li>
        </ul>

        <h2>Photo ideas for cats</h2>
        <ul>
          <li>The same spot, every month. Pick their favorite perch, same angle, twelve shots. This alone is worth the project.</li>
          <li>Inside their hiding spot. Cats have private spaces. Photograph them from the cat&rsquo;s perspective, looking out.</li>
          <li>
            The sleep archive. Cats sleep sixteen hours a day in increasingly improbable positions. This is the
            easiest photo series you&rsquo;ll ever maintain.
          </li>
          <li>Paws and scale. Their paw on your hand, month one and month twelve.</li>
          <li>Keep the blurry ones. Blur means zoomies, and zoomies mean kitten.</li>
        </ul>

        <h2>What to write when they&rsquo;re &ldquo;just sleeping&rdquo;</h2>
        <p>
          Cats spend most of their lives doing things that look like nothing. But &ldquo;nothing&rdquo; is the
          material. Where they&rsquo;re sleeping, how they&rsquo;re curled, whether they twitched at a sound and went
          back under. One sentence about an unremarkable afternoon is exactly the page you can never recreate later.
        </p>
        <p>
          If you need a starting point, the <a href="/blog/pet-journal-prompts">pet journal prompts</a> list has
          questions that work for cats, and the <a href="/blog/cat-memory-book">cat memory book guide</a> has
          structural ideas for organizing all of this into themed pages. For a broader look at how to build a
          journaling habit that sticks, the{" "}
          <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> covers frequency, format, and
          how to keep it sustainable.
        </p>

        <h2>Turning the first year into a real book</h2>
        <p>
          The pattern is the same as for puppies (and the{" "}
          <a href="/blog/puppy-first-year-memory-book">puppy first year guide</a> has more on this): the projects
          that succeed are the ones built as you go, not assembled from memory months later. One sentence per day, or
          even per week, adds up to a rich first-year story by the time the birthday comes around.
        </p>
        <p>
          Everypaw handles this automatically: you journal the moments, AI turns them into monthly story chapters,
          and the first year becomes a printed hardcover book. But whatever system you use, start tonight. The kitten
          sleeping on your keyboard right now will be a full-grown cat shockingly soon.
        </p>
      </ArticleLayout>
    </>
  );
}
