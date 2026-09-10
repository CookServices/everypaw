import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("dog-bucket-list")!;
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
          Most dog bucket lists are about the dog having fun. This one is about that too, but with a second purpose:
          every item on this list produces a story worth writing down. An adventure your dog loved is a great
          afternoon. An adventure your dog loved that you recorded, even in one sentence, is a memory book page
          you&rsquo;ll have forever.
        </p>
        <p>
          Here are 25 adventures organized by effort, from &ldquo;you can do this today&rdquo; to &ldquo;start
          planning now,&rdquo; each with a note on what to capture so the moment doesn&rsquo;t just pass.
        </p>

        <h2>No-effort adventures (do one tonight)</h2>
        <p>
          <strong>1. The sniff walk.</strong> Let your dog lead entirely. No destination, no pace, no pulling them
          along. Follow wherever their nose goes for thirty minutes. Write down the route they chose and the spot
          they spent the longest investigating.
        </p>
        <p>
          <strong>2. The forbidden food.</strong> One special treat they never get: a piece of real chicken, a
          dog-safe cupcake, a lick of peanut butter from a spoon. Photograph the face. Describe the reaction.
        </p>
        <p>
          <strong>3. The new toy ceremony.</strong> Buy a toy, present it, and document the full first encounter: the
          sniff, the test bite, the decision to either love it or ignore it forever. Name the toy. Start the file.
        </p>
        <p>
          <strong>4. The car ride with no vet at the end.</strong> Just a drive. Windows down. No destination that
          involves a thermometer. Note where they chose to look and whether they fell asleep.
        </p>
        <p>
          <strong>5. The full-body belly rub.</strong> Five uninterrupted minutes of the best belly rub you&rsquo;ve
          ever given. Not while watching TV. Full attention. Write one sentence about how they positioned themselves.
        </p>

        <h2>Low-effort adventures (this weekend)</h2>
        <p>
          <strong>6. A new park.</strong> Not your regular one. Somewhere they&rsquo;ve never sniffed before.
          Describe their first three minutes: the scan, the first smell, the first opinion.
        </p>
        <p>
          <strong>7. A playdate.</strong> Arrange a meeting with a dog they like (or a dog they&rsquo;ve never met).
          Document the greeting ritual and how long it took them to relax.
        </p>
        <p>
          <strong>8. The puddle, the mud, or the sprinkler.</strong> Find water and let them be ridiculous in it. The
          messier, the better. Take the blurry photos. Write about the cleanup.
        </p>
        <p>
          <strong>9. A dog-friendly caf&eacute; or restaurant.</strong> Sit somewhere with them where they can watch
          people. Note what they watched, what startled them, and what they ignored.
        </p>
        <p>
          <strong>10. Sunrise or sunset together.</strong> Go somewhere with a view at golden hour. Sit. Do nothing.
          The photo practically takes itself, and the quiet is the story.
        </p>

        <h2>Medium-effort adventures (plan a day)</h2>
        <p>
          <strong>11. The beach day.</strong> First time or fiftieth time, the beach is always a bucket list item.
          Write about what they did with the waves, whether they chased a seagull, and how much sand ended up in the
          car.
        </p>
        <p>
          <strong>12. A hike on a new trail.</strong> Pick one with good footing and manageable distance for your
          dog. Record the pace, the things they stopped for, and the spot where they decided it was time to rest.
        </p>
        <p>
          <strong>13. A dog-friendly road trip.</strong> Two or three hours to somewhere you&rsquo;ve both never been.
          The car behavior, the arrival excitement, the exploration. One sentence per stage is a whole chapter.
        </p>
        <p>
          <strong>14. Swimming (or not).</strong> Take them to a safe body of water and find out their opinion. Some
          dogs are born swimmers. Some refuse to get their paws wet. Both reactions are worth the page.
        </p>
        <p>
          <strong>15. A visit to where you got them.</strong> Go back to the shelter, the breeder, the neighborhood
          where you first met. If you do this on a <a href="/blog/gotcha-day-ideas">gotcha day</a>, it doubles as an
          annual tradition.
        </p>
        <p>
          <strong>16. The &ldquo;bring a friend&rdquo; walk.</strong> Invite a human friend who has never walked your
          dog. Watch how your dog behaves differently with someone new holding the leash. Ask the friend to describe
          the experience.
        </p>
        <p>
          <strong>17. A professional photo session.</strong> Not a studio portrait (unless that&rsquo;s your thing).
          A candid session in a park with a photographer who specializes in pets. The resulting photos, with dates
          and context, become the backbone of a <a href="/blog/dog-memory-book-ideas">dog memory book</a>.
        </p>

        <h2>Big adventures (plan ahead)</h2>
        <p>
          <strong>18. First snow.</strong> If your dog has never seen snow, the first encounter is one of the best
          stories you&rsquo;ll ever have. If they&rsquo;ve seen it every year, photograph it anyway. Snow dogs in
          snow never get old.
        </p>
        <p>
          <strong>19. A dog-friendly hotel stay.</strong> One night somewhere that isn&rsquo;t home. The room
          inspection, the new bed assessment, the hallway noises. Write about the check-in.
        </p>
        <p>
          <strong>20. A boat ride.</strong> Canoe, kayak, ferry, rowboat. Your dog on water is a story that writes
          itself. Life jacket required. Dignity optional.
        </p>
        <p>
          <strong>21. An agility course or dog sport.</strong> Even a single introductory class. The coordination (or
          lack thereof), the pride (or confusion), the treats that made it work.
        </p>
        <p>
          <strong>22. A long camping trip.</strong> One or two nights outside together. Tent behavior, campfire
          proximity, the midnight sounds they reacted to, the morning they woke up in the wild and checked on you
          first.
        </p>
        <p>
          <strong>23. Meet the family.</strong> A trip to see parents, siblings, or old friends who haven&rsquo;t met
          the dog. The introduction, the verdict, the person who said &ldquo;I&rsquo;m not a dog person&rdquo; and
          then spent the whole visit on the floor.
        </p>
        <p>
          <strong>24. A birthday party.</strong> Not a human birthday. Their birthday. Invite the dog friends. Make a
          dog-safe cake. This is absurd and perfect and you&rsquo;ll be glad you did it. Write the guest list.
        </p>
        <p>
          <strong>25. The adventure they chose.</strong> Go somewhere open with no plan and follow wherever they go.
          No leash if it&rsquo;s safe, no agenda, no timeline. Document what they chose when the choice was entirely
          theirs.
        </p>

        <h2>The rule that makes the list worth keeping</h2>
        <p>
          Every adventure on this list becomes a bucket list item when you do it, and a memory book page when you
          write about it. The writing doesn&rsquo;t have to be long. One sentence works: &ldquo;First beach, June
          2027. She ate sand and tried to fight a wave. I have never seen a dog so happy.&rdquo;
        </p>
        <p>
          If you&rsquo;re building a pet journal alongside this list, the{" "}
          <a href="/blog/pet-journal-prompts">pet journal prompts</a> can help you capture the details that make each
          adventure specific. And if you want to turn the whole collection into something physical, the{" "}
          <a href="/blog/how-to-keep-a-pet-memory-journal">pet memory journal guide</a> explains how to build the
          habit that connects adventures to pages.
        </p>
        <p>
          Everypaw is designed for exactly this: you write the moment, AI turns it into a story chapter, and the
          chapters become a printed hardcover book. But whatever you use, write tonight&rsquo;s adventure down before
          you go to sleep. The details are already fading.
        </p>
      </ArticleLayout>
    </>
  );
}
