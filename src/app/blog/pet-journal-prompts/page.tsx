import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("pet-journal-prompts")!;
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
          The hardest part of keeping a pet journal isn&rsquo;t finding the time. It&rsquo;s the blank page. You sit
          down, your dog is asleep two feet away doing something objectively adorable, and your brain still produces
          nothing better than &ldquo;today was nice.&rdquo;
        </p>
        <p>
          Prompts fix that. A good prompt turns &ldquo;I should write something&rdquo; into a question you can answer in
          one sentence, in thirty seconds, on your phone. Below are 50 pet journal prompts organized by theme: everyday
          life, personality, milestones, your bond, and the harder chapters. You&rsquo;ll never need all of them. You
          just need one, on the days when nothing comes.
        </p>

        <h2>How to use these prompts</h2>
        <p>
          A few ground rules that make journaling about your pet sustainable instead of turning it into another chore:
        </p>
        <ul>
          <li>
            One sentence is a complete entry. &ldquo;He sat by the door for 20 minutes after the vet&rdquo; is a perfect
            journal entry. Length is not the point; specificity is.
          </li>
          <li>Don&rsquo;t go in order. Scan the list, pick the one that sparks something today, ignore the rest.</li>
          <li>Date everything. In five years, &ldquo;October 2026, when she still fit in one hand&rdquo; is half the emotion.</li>
          <li>
            Photo captions count. If writing feels heavy, describe the photo you just took. That context is exactly what
            fades first.
          </li>
        </ul>

        <h2>Everyday moments (prompts 1-10)</h2>
        <p>
          The ordinary days are the ones that vanish from memory fastest, and the ones that will mean the most later.
        </p>
        <ul>
          <li>1. What did they do today that made you smile, even for a second?</li>
          <li>2. Describe their exact position on the couch (or bed, or forbidden chair) right now.</li>
          <li>3. What&rsquo;s the current favorite toy, and what condition is it in?</li>
          <li>4. What sound did they make today that you&rsquo;d recognize among a thousand?</li>
          <li>
            5. Describe today&rsquo;s walk in three details: something they smelled, someone they met, a spot they
            refused to leave.
          </li>
          <li>6. What did they do while you cooked dinner?</li>
          <li>7. How did they wake you up this morning, and at what time, exactly?</li>
          <li>8. Describe their dinner ritual: the dance, the stare, the exact spot where they wait.</li>
          <li>9. What do they do when it rains?</li>
          <li>10. What tiny routine happened today that happens every single day?</li>
        </ul>

        <h2>Personality and quirks (prompts 11-20)</h2>
        <p>
          This is the section future-you will reread the most. If you have a cat and these prompts feel dog-heavy, the{" "}
          <a href="/blog/cat-memory-book">cat memory book guide</a> has prompts and structures designed for quieter
          companions.
        </p>
        <ul>
          <li>11. List their nicknames and how each one started.</li>
          <li>12. What are they completely, irrationally afraid of?</li>
          <li>13. What household &ldquo;rule&rdquo; did they invent that you now follow?</li>
          <li>14. If they could say one sentence, what would it be?</li>
          <li>15. What happens when you say their favorite word out loud?</li>
          <li>16. Describe their guilty face, and what usually causes it.</li>
          <li>17. Who&rsquo;s their favorite person, and how can you tell?</li>
          <li>18. What&rsquo;s the strangest thing they&rsquo;ve ever claimed as their own?</li>
          <li>19. How do they ask for attention? Describe the full escalation, step by step.</li>
          <li>20. What habit of theirs would only make sense to someone who lives with them?</li>
        </ul>

        <h2>Firsts and milestones (prompts 21-30)</h2>
        <p>
          If you&rsquo;re in the first twelve months, a{" "}
          <a href="/blog/puppy-first-year-memory-book">month-by-month puppy memory book guide</a> can help you structure
          the whole year around these firsts.
        </p>
        <ul>
          <li>21. Write the story of the day you brought them home, with every detail you still have.</li>
          <li>22. How did their first night go, honestly?</li>
          <li>23. How did they get their name, and what were the rejected candidates?</li>
          <li>24. How did their first car ride or trip go?</li>
          <li>25. When was the first time they made you laugh out loud?</li>
          <li>26. What &ldquo;first&rdquo; happened recently: a new food, a new friend, a new place?</li>
          <li>27. When did you realize they trusted you?</li>
          <li>28. Describe their first encounter with snow, the sea, stairs, or a mirror.</li>
          <li>29. What training moment finally clicked, and what made it click?</li>
          <li>30. How did you celebrate their last birthday or gotcha day?</li>
        </ul>

        <h2>Your bond (prompts 31-40)</h2>
        <ul>
          <li>31. Describe, move by move, how they greet you when you come home.</li>
          <li>32. What do they do when you&rsquo;re sad?</li>
          <li>33. Describe a moment this week when the two of you just sat together.</li>
          <li>34. What have they changed about you?</li>
          <li>35. On a day away from them, what do you miss first?</li>
          <li>36. Write about a hard day they made better without knowing it.</li>
          <li>37. What does it feel like when they&rsquo;re completely calm next to you?</li>
          <li>38. What do you say to them when no one else is around?</li>
          <li>
            39. Describe the way they look at you when they want something, and when they want nothing at all.
          </li>
          <li>40. Which of their routines has quietly become one of yours?</li>
        </ul>

        <h2>The harder chapters (prompts 41-50)</h2>
        <p>
          Vet visits, aging, illness, and loss are part of the story too. These are the hardest entries to write, and
          the ones you&rsquo;ll be most grateful for. If you&rsquo;re journaling through grief, go at your own pace. And
          if you&rsquo;re looking for a way to honor a pet you&rsquo;ve lost, a{" "}
          <a href="/memorial">pet memorial book</a> can be part of that.
        </p>
        <ul>
          <li>41. How did they handle the vet today, and how did you?</li>
          <li>42. What made a sick day easier for both of you?</li>
          <li>43. What has changed as they&rsquo;ve gotten older, and what hasn&rsquo;t changed at all?</li>
          <li>44. What do you want to remember about them exactly as they are today?</li>
          <li>
            45. Write about their gray muzzle, slower walks, or longer naps, with tenderness rather than sadness.
          </li>
          <li>46. If they could understand every word for one minute, what would you say?</li>
          <li>47. Write down a scare that ended well, now that it&rsquo;s over.</li>
          <li>48. What do they still do exactly the way they did as a puppy or kitten?</li>
          <li>49. If you could keep one of their rituals forever, which one would it be?</li>
          <li>50. Describe them today as if you were reading it ten years from now.</li>
        </ul>

        <h2>How to make journaling stick</h2>
        <ul>
          <li>
            Attach it to a routine you already have: after the evening walk, with your morning coffee, right after
            feeding time.
          </li>
          <li>
            Keep the one-sentence rule sacred. The day you decide entries must be &ldquo;good,&rdquo; you&rsquo;ll stop
            writing them.
          </li>
          <li>Don&rsquo;t backfill out of guilt. You missed three weeks? Fine. Start with today.</li>
          <li>Let entries be unpolished. Typos, fragments, half-thoughts: this is a journal, not an essay.</li>
        </ul>
        <p>
          For a deeper look at building a sustainable habit, the{" "}
          <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> covers frequency, format, and how
          to make entries that age well.
        </p>

        <h2>From scattered notes to their story</h2>
        <p>
          Individually, these entries are small. Together, they&rsquo;re the story of a life: the walks, the quirks, the
          hard days, the ridiculous ones. That&rsquo;s the idea behind Everypaw: you write the one-sentence moments, and
          every month they&rsquo;re turned into a story chapter, then at the end of the year into a printed hardcover
          book. If you want to go further, here are{" "}
          <a href="/blog/dog-memory-book-ideas">12 dog memory book ideas</a> that turn these entries into pages worth
          keeping. And if you&rsquo;re ready to turn those entries into a complete narrative, here&rsquo;s a guide to{" "}
          <a href="/blog/write-your-pets-life-story">writing your pet&rsquo;s life story</a>, step by step. But
          whatever tool you use, the principle is the same: one honest sentence at a time, starting today.
        </p>
      </ArticleLayout>
    </>
  );
}
