import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("write-your-pets-life-story")!;
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
          You don&rsquo;t need to be a writer to write your pet&rsquo;s life story. You need to have lived with them,
          paid attention, and cared enough to sit down with a blank page. That&rsquo;s it. The story is already there.
          The only question is how to get it out of your head and into something you can read back in ten years.
        </p>
        <p>Here&rsquo;s how to do it, step by step, without any literary ambition required.</p>

        <h2>Forget chronology (at first)</h2>
        <p>
          The instinct is to start at the beginning: &ldquo;We got him on a Tuesday in March.&rdquo; That&rsquo;s fine
          for a first sentence, but it&rsquo;s the wrong way to start writing. Chronological order is how you&rsquo;ll
          organize the story later. Right now, start with whatever memory is loudest.
        </p>
        <p>
          Maybe it&rsquo;s the way she greeted you after your first week-long trip. Maybe it&rsquo;s the emergency vet
          visit that turned out to be nothing. Maybe it&rsquo;s Tuesday nights on the couch. Write that scene first, in
          as much detail as you can, and don&rsquo;t worry about where it fits.
        </p>
        <p>Once you have five or six of these fragments, the structure will start to show itself.</p>

        <h2>The five chapters every pet story has</h2>
        <p>
          You don&rsquo;t have to use these exact divisions, but almost every pet&rsquo;s life story falls naturally
          into five chapters:
        </p>

        <h3>How you found each other</h3>
        <p>
          The decision, the search, the first meeting, the ride home. Include the details that seem too small: who
          drove, what they did in the car, where they slept the first night. These are the details that disappear
          first.
        </p>

        <h3>Who they became</h3>
        <p>
          Their personality, fully formed: the quirks, the fears, the routines, the things they did that no other
          animal does exactly the same way. This chapter is usually the longest and the most fun to write. If you need
          help pulling out specifics, the <a href="/blog/pet-journal-prompts">pet journal prompts</a> list is built for
          exactly this.
        </p>

        <h3>The life you built together</h3>
        <p>
          The apartment they knew, the walks they memorized, the people they loved, the other animals in the household.
          This is the chapter about context: the world your pet lived in, which is also the world they shaped.
        </p>

        <h3>The milestones</h3>
        <p>
          First snow, first birthday, first time they trusted a stranger, the day they stopped being afraid of the
          vacuum. Not just the firsts: also the lasts you didn&rsquo;t know were lasts until later.
        </p>

        <h3>The harder part</h3>
        <p>
          Aging, illness, the final days. This chapter is optional in timing (you can write it when you&rsquo;re ready,
          or not at all), but people who do write it are almost always glad they did. The{" "}
          <a href="/blog/pet-loss-keepsake-ideas">pet loss keepsake ideas</a> article has more on how to approach this
          chapter with care.
        </p>

        <h2>How to write scenes, not summaries</h2>
        <p>
          The difference between a pet story you&rsquo;ll reread and one you won&rsquo;t is specificity. Compare these
          two entries:
        </p>
        <p>
          &ldquo;Max loved going to the park.&rdquo; That&rsquo;s a summary. It tells you nothing you didn&rsquo;t
          already know.
        </p>
        <p>
          &ldquo;Max would start whining the moment I picked up my keys, spin in three full circles by the door, then
          sit perfectly still as if to prove he deserved to go. At the park, he always went to the same bench first and
          checked underneath it for reasons known only to him.&rdquo; That&rsquo;s a scene. It has motion, detail, and
          personality. You can see the dog.
        </p>
        <p>
          You don&rsquo;t need every entry to be this detailed. But when a memory is strong enough to write as a scene,
          write it as a scene.
        </p>

        <h2>Use your own voice</h2>
        <p>
          The biggest mistake people make is trying to sound literary. Your pet&rsquo;s story should sound like you
          telling a friend about your pet: warm, specific, occasionally funny, sometimes not. If you talk to your pet
          in a ridiculous voice at home, let that voice appear. If you swear when you tell the story of the couch
          incident, keep the swearing. Authenticity is what makes a pet story feel like a keepsake instead of a
          greeting card.
        </p>

        <h2>What if you didn&rsquo;t keep a journal?</h2>
        <p>Most people don&rsquo;t, and it&rsquo;s not too late. Here&rsquo;s how to reconstruct:</p>
        <ul>
          <li>
            Go through your camera roll chronologically. Photos are memory triggers, and the dates on them give you a
            timeline you can&rsquo;t reconstruct from memory alone.
          </li>
          <li>
            Ask the people who knew your pet. Partners, roommates, family members, dog park regulars. They remember
            things you&rsquo;ve forgotten, and their version of your pet is part of the story too.
          </li>
          <li>
            Check old texts and social media posts. You probably mentioned your pet more than you think. Those
            fragments, dated and casual, are raw material.
          </li>
          <li>
            Use the <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> framework even if
            you&rsquo;re writing backwards. The categories (daily snapshots, personality, relationships, milestones)
            work just as well for reconstructing a life as for recording one in real time.
          </li>
        </ul>

        <h2>Don&rsquo;t edit while you write</h2>
        <p>
          Get the memories down first. All of them, in whatever order they come, however rough. Editing and writing are
          different jobs, and doing both at once is the fastest way to produce nothing. Write the messy draft. Then
          leave it for a few days. Then come back and shape it.
        </p>

        <h2>Turning the story into something you can hold</h2>
        <p>
          A finished pet life story can live in a notebook, a Google Doc, or your notes app. But if you want something
          physical, there are two paths:
        </p>
        <p>
          The manual path: format the text, choose photos, design a layout, and order a printed book through any photo
          book service. This works, but it requires a dedicated afternoon (or weekend) of assembly, which is where most
          projects stall.
        </p>
        <p>
          The automatic path: journal the moments as they happen, and let the assembly happen for you. That&rsquo;s
          what Everypaw does. You write the entries, AI turns them into monthly story chapters, and those chapters
          become a hardcover book. The life story builds itself, one entry at a time.
        </p>
        <p>
          For specific page ideas and structural inspiration, the{" "}
          <a href="/blog/dog-memory-book-ideas">dog memory book ideas</a> article has twelve page concepts that work
          well in any pet&rsquo;s story. And if your pet is a cat, the{" "}
          <a href="/blog/cat-memory-book">cat memory book guide</a> covers how to capture a quieter kind of narrative.
        </p>
        <p>
          Not sure which approach suits you? The{" "}
          <a href="/blog/pet-journal-app-vs-photo-book">journal app vs photo book comparison</a> covers the
          trade-offs between writing-first and photos-first workflows.
        </p>

        <h2>Start with one scene</h2>
        <p>
          Don&rsquo;t commit to writing the whole story tonight. Just write one scene: the funniest one, the most vivid
          one, the one you tell at dinner parties. Get it down in two or three paragraphs. Save it somewhere you
          won&rsquo;t lose it.
        </p>
        <p>
          Tomorrow, write another. The life story is just a collection of scenes, and you already know all of them.
        </p>
      </ArticleLayout>
    </>
  );
}
