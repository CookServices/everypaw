import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost } from "@/lib/blog";

const post = getPost("pet-memorial-gifts")!;

export const metadata: Metadata = {
  title: `${post.title} | Everypaw`,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
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
          When a friend loses a pet, you want to do something. But &ldquo;something&rdquo; is hard to pin down.
          Flowers feel generic. A card feels small. And anything you find online that says &ldquo;pet memorial&rdquo;
          tends to be either mass-produced or so personalized that you&rsquo;d need information you don&rsquo;t have.
        </p>
        <p>
          The truth is, the best pet memorial gifts aren&rsquo;t about the object. They&rsquo;re about showing your
          friend that you understood the relationship, that you know this wasn&rsquo;t &ldquo;just a pet,&rdquo; and
          that you&rsquo;re not going to rush them through it.
        </p>
        <p>
          Here are seven ideas, ordered from the simplest gesture to the most involved, along with a few things that
          are well-intentioned but worth avoiding.
        </p>

        <h2>1. Say the pet&rsquo;s name</h2>
        <p>
          This isn&rsquo;t a gift you buy. It&rsquo;s the one that matters most. In your card, your text, your visit,
          use the pet&rsquo;s name. &ldquo;I&rsquo;m sorry about Milo&rdquo; lands completely differently from
          &ldquo;I&rsquo;m sorry about your loss.&rdquo; The name says: I remember who they were. I know this was
          specific.
        </p>
        <p>
          If you have a memory of the pet, share it. Even a small one. &ldquo;I still think about the time Milo stole
          my sandwich at the barbecue&rdquo; is more comforting than most sympathy cards.
        </p>

        <h2>2. A meal they don&rsquo;t have to think about</h2>
        <p>
          Grief is exhausting, and cooking is one of the first things that stops. Drop off a meal, order delivery, or
          fill their fridge with easy things. This isn&rsquo;t a pet-specific gift, but it&rsquo;s the one people
          remember most. Don&rsquo;t ask &ldquo;what can I bring?&rdquo; Just bring something. Asking adds a decision
          to a day that already has too many.
        </p>

        <h2>3. A framed photo you took</h2>
        <p>
          Go through your own camera roll. If you ever took a photo of their pet, even a bad one, even a blurry one
          in the background of a group shot, get it printed and framed. This works precisely because it&rsquo;s a
          photo they&rsquo;ve never seen, from an angle they didn&rsquo;t choose. It proves the pet existed in someone
          else&rsquo;s life too.
        </p>

        <h2>4. A handwritten note with a real memory</h2>
        <p>
          Not a sympathy card with a printed poem. A note, in your handwriting, that says something real about the
          pet. What you noticed about them. What they did when you visited. How your friend talked about them. Keep
          it short. The specificity is what makes it valuable.
        </p>

        <h2>5. A donation in the pet&rsquo;s name</h2>
        <p>
          Find out where the pet came from (a shelter, a rescue, a breed organization) and make a donation in the
          pet&rsquo;s name. If you don&rsquo;t know the origin, choose a local shelter. Send your friend a simple
          note: &ldquo;I made a donation to [shelter] in Milo&rsquo;s name.&rdquo; No amount is too small. The gesture
          is the point.
        </p>

        <h2>6. A memory book or journal to write in</h2>
        <p>
          A blank journal dedicated to their pet can be a meaningful gift, especially if your friend is the kind of
          person who processes things through writing. Pair it with a note: &ldquo;Whenever you&rsquo;re ready, for
          whatever you want to remember.&rdquo; Don&rsquo;t push them to use it right away. Some people start writing
          the same week. Some wait months. Both are fine.
        </p>
        <p>
          If you want to suggest a starting point for them, the{" "}
          <a href="/blog/pet-journal-prompts">pet journal prompts</a> list has a section on the harder chapters
          that&rsquo;s designed for exactly this kind of writing. And if they already have notes or entries from
          their pet&rsquo;s life, they might find the{" "}
          <a href="/blog/write-your-pets-life-story">guide to writing a pet&rsquo;s life story</a> helpful when
          they&rsquo;re ready.
        </p>

        <h2>7. A memorial page or keepsake they can return to</h2>
        <p>
          For a friend who would value a permanent, shareable space for their pet&rsquo;s memory, Everypaw&rsquo;s{" "}
          <a href="/memorial">memorial page</a> lets them create a quiet place online with their pet&rsquo;s photo,
          their own message, and tributes from others. It&rsquo;s the kind of gift that works best when you set up
          the space and invite them to fill it when they&rsquo;re ready, rather than handing them a task during the
          hardest week.
        </p>
        <p>
          For more ideas on keepsakes that the pet owner can create for themselves, the{" "}
          <a href="/blog/pet-loss-keepsake-ideas">pet loss keepsake ideas</a> article covers nine approaches from the
          owner&rsquo;s perspective.
        </p>

        <h2>What to avoid</h2>
        <p>A few well-intentioned gestures that tend to land wrong:</p>
        <ul>
          <li>
            Anything that implies a timeline. &ldquo;You&rsquo;ll feel better soon&rdquo; or &ldquo;Are you ready for
            a new one?&rdquo; are the two sentences grieving pet owners hear most and appreciate least.
          </li>
          <li>
            Generic &ldquo;rainbow bridge&rdquo; merchandise, unless you know your friend connects with that imagery.
            For many people, it feels impersonal.
          </li>
          <li>
            Surprise portraits or custom jewelry without checking first. These can be beautiful, but they require
            getting the likeness right, and a portrait that doesn&rsquo;t look like their pet can hurt more than it
            helps.
          </li>
          <li>
            Comparing losses. &ldquo;I know how you feel, my goldfish died in 2015&rdquo; is not the comfort you
            think it is, even if the feeling was real.
          </li>
        </ul>

        <h2>The gift that takes no planning</h2>
        <p>
          Show up. Text without expecting a reply. Say the pet&rsquo;s name. Mention a memory. Come back in three
          weeks when everyone else has moved on and bring it up again, because the silence after the first wave of
          sympathy is often the hardest part.
        </p>
        <p>
          The most thoughtful pet memorial gift isn&rsquo;t something you buy. It&rsquo;s proof that you noticed who
          was missing.
        </p>
      </ArticleLayout>
    </>
  );
}
