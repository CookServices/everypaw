import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("help-child-remember-pet")!;
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
          Children remember pets differently from adults. An adult remembers the vet visits, the walks, the long arc
          of a shared life. A child remembers the sound the dog made when the school bus pulled up, the specific
          corner of the bed the cat always slept in, and the time the hamster escaped and ended up in a shoe.
        </p>
        <p>
          Those memories are vivid now, but they&rsquo;re also fragile. A seven-year-old who loses a pet won&rsquo;t
          remember the details at seventeen unless someone helps them hold on. That&rsquo;s what this guide is for:
          not grief counseling, not a clinical framework, but practical ways to help your child capture and keep the
          memories of a pet they loved.
        </p>

        <h2>Let them lead the format</h2>
        <p>
          Some kids want to write. Some want to draw. Some want to talk while you write for them. Some want to glue
          photos into a notebook. Some want to make a video on your phone. All of these are valid memory-keeping, and
          the worst thing you can do is impose a format that feels like homework.
        </p>
        <p>
          Ask: &ldquo;Would you like to make something to remember [pet&rsquo;s name]?&rdquo; Then follow their lead.
          The project should feel like theirs, not like an assignment.
        </p>

        <h2>Simple memory book ideas for kids</h2>

        <h3>The &ldquo;All About&rdquo; page</h3>
        <p>
          One page with simple prompts: their pet&rsquo;s name, breed, favorite food, favorite toy, favorite spot,
          funniest habit, and a drawing or photo. This is the easiest starting point for younger children (ages 4 to
          7) and can be done in one sitting.
        </p>

        <h3>The interview</h3>
        <p>
          Sit with your child and ask questions, then write down their answers exactly as they say them. &ldquo;What
          did [pet&rsquo;s name] do that was silly?&rdquo; &ldquo;What was their favorite thing?&rdquo; &ldquo;What
          did they do when you came home from school?&rdquo; The child&rsquo;s own words, transcribed faithfully, are
          more valuable than any polished text. Date the page.
        </p>

        <h3>The drawing journal</h3>
        <p>
          A blank notebook where they draw their pet from memory, whenever they feel like it. No prompts, no
          schedule. Just a dedicated space. Over time, the drawings become a record of how the child&rsquo;s memory
          and artistic ability evolve together.
        </p>

        <h3>The photo caption project</h3>
        <p>
          Print a handful of photos of the pet and let the child write (or dictate) a caption for each one: what was
          happening, who was there, why this photo matters. This is a low-pressure activity that works for kids who
          resist writing but will talk about a photo all day.
        </p>

        <h3>The letter</h3>
        <p>
          Encourage them to write a letter to their pet. It can say anything: what they miss, what they remember,
          what they wish they could do one more time. This works best for older children (8 and up) who are
          comfortable with writing. Don&rsquo;t edit it. Don&rsquo;t correct the spelling. The letter is for them.
        </p>

        <h2>Journaling prompts adapted for kids</h2>
        <p>Adult pet journal prompts can feel abstract for children. Here are simpler versions:</p>
        <ul>
          <li>What was [pet&rsquo;s name]&rsquo;s favorite thing to do?</li>
          <li>Describe the sound they made when they were happy.</li>
          <li>What did they do that always made you laugh?</li>
          <li>Draw their favorite sleeping spot.</li>
          <li>What&rsquo;s one thing you taught them, and one thing they taught you?</li>
          <li>If they could talk, what would they say right now?</li>
          <li>What do you want to remember about them when you&rsquo;re older?</li>
        </ul>
        <p>
          For a longer list of prompts that works for the whole family, the{" "}
          <a href="/blog/pet-journal-prompts">50 pet journal prompts</a> article has sections on personality,
          milestones, and the bond between pet and owner.
        </p>

        <h2>When the pet is still alive</h2>
        <p>
          The best time to start a pet memory project with a child is while the pet is still there. It&rsquo;s
          easier, more joyful, and produces material that becomes priceless later.
        </p>
        <p>
          A family pet journal where everyone (parents and children) adds an entry per week is one approach. The
          entries can be one sentence each. &ldquo;Biscuit barked at the vacuum again and Sophie tried to protect
          her.&rdquo; Over a year, these fragments accumulate into a story the whole family shares.
        </p>
        <p>
          If you have a puppy or kitten, involving your child in a{" "}
          <a href="/blog/puppy-first-year-memory-book">first year memory book</a> (or the{" "}
          <a href="/blog/kitten-first-year-memory-book">kitten version</a>) gives the project a built-in timeline and
          natural momentum.
        </p>

        <h2>After a loss</h2>
        <p>
          If the pet has already died, the memory project serves a different purpose: it helps the child hold on to
          what they&rsquo;re afraid of forgetting. A few things to keep in mind:
        </p>
        <ul>
          <li>
            <strong>Don&rsquo;t rush it.</strong> Some children will want to start immediately. Some will need weeks
            or months. Both timelines are normal.
          </li>
          <li>
            <strong>Don&rsquo;t sanitize.</strong> If the child wants to include the sad parts (the vet visit, the
            last day, the empty bed), let them. Editing out the hard moments teaches them that grief should be
            hidden, which is not the lesson you want.
          </li>
          <li>
            <strong>Revisit together.</strong> A memory book made at age six becomes a shared object you can look at
            together at age ten, at fourteen, at twenty. The revisiting matters as much as the making.
          </li>
        </ul>
        <p>
          For more on navigating pet loss as a family, the{" "}
          <a href="/blog/pet-loss-keepsake-ideas">pet loss keepsake ideas</a> article has approaches for all ages,
          and the <a href="/blog/pet-sympathy-card">pet sympathy card guide</a> can help older children write to a
          friend who has lost a pet.
        </p>

        <h2>Making it a family practice</h2>
        <p>
          The most sustainable version of this isn&rsquo;t a one-time project after a loss. It&rsquo;s an ongoing
          family habit: noticing what the pet did today, saying it out loud at dinner, writing it down once a week.
          The child learns that paying attention is how you love something, and that writing things down is how you
          keep them.
        </p>
        <p>
          Everypaw can be part of that family habit: each family member contributes entries, the AI turns them into
          monthly story chapters, and the year becomes a printed hardcover book the child can keep on their shelf.
          But the tool matters less than the practice. Tonight, at dinner, ask your child: &ldquo;What did
          [pet&rsquo;s name] do today that was funny?&rdquo; Write down whatever they say. That&rsquo;s the first
          page.
        </p>
      </ArticleLayout>
    </>
  );
}
