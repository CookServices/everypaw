import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost, getFrSlugForEn } from "@/lib/blog";

const post = getPost("pet-sympathy-card")!;
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
          You&rsquo;re holding a card. You&rsquo;ve written &ldquo;Dear [name],&rdquo; and now you&rsquo;re staring at
          the blank space below it, because everything you think of sounds either too much or not enough. The pet
          died yesterday, or last week, or a month ago, and you want to say something that actually means something.
        </p>
        <p>
          Here&rsquo;s the good news: the bar is lower than you think. A pet sympathy card doesn&rsquo;t need to be
          eloquent. It needs to be specific, short, and real.
        </p>

        <h2>The one rule that matters</h2>
        <p>
          Use the pet&rsquo;s name. Not &ldquo;your dog&rdquo; or &ldquo;your cat&rdquo; or &ldquo;your pet.&rdquo;
          Their name. That single detail transforms a generic card into proof that you knew who was missing.
        </p>
        <p>
          &ldquo;I&rsquo;m so sorry about Biscuit&rdquo; is already better than 90% of sympathy cards. Start there.
        </p>

        <h2>What to write: simple examples</h2>
        <p>
          You don&rsquo;t need to write a paragraph. Two or three sentences is plenty. Here are some starting points
          you can use as-is or adapt:
        </p>
        <p>
          <strong>When you knew the pet well:</strong>
          <br />
          &ldquo;I keep thinking about the time Biscuit stole my shoe and hid it under the bed. She had such a
          specific personality, and your house will feel different without her. I&rsquo;m sorry.&rdquo;
        </p>
        <p>
          <strong>When you didn&rsquo;t know the pet well, but you know your friend:</strong>
          <br />
          &ldquo;I could always tell how much Luna meant to you. I&rsquo;m sorry she&rsquo;s gone. If you want to talk
          about her, I&rsquo;d like to listen.&rdquo;
        </p>
        <p>
          <strong>When you&rsquo;re not sure what to say:</strong>
          <br />
          &ldquo;I don&rsquo;t have the right words, but I want you to know I&rsquo;m thinking of you and of Max. He
          was lucky to have you.&rdquo;
        </p>
        <p>
          <strong>For a coworker or acquaintance:</strong>
          <br />
          &ldquo;I was sorry to hear about Charlie. I know he was an important part of your life, and I hope the
          good memories bring you some comfort.&rdquo;
        </p>
        <p>
          <strong>For a child who lost a pet:</strong>
          <br />
          &ldquo;I&rsquo;m sorry about Pepper. It&rsquo;s okay to be really sad. She knew you loved her, and
          that&rsquo;s the most important thing.&rdquo;
        </p>

        <h2>What makes a card land</h2>
        <p>
          A few small choices that make the difference between a card someone keeps and one they forget:
        </p>
        <ul>
          <li>
            <strong>One specific memory.</strong> If you ever met the pet, share one moment you remember. It
            doesn&rsquo;t have to be dramatic. &ldquo;I remember how she always sat on your feet&rdquo; is enough.
          </li>
          <li>
            <strong>Acknowledge the weight.</strong> Don&rsquo;t minimize it. &ldquo;I know how much he meant to
            you&rdquo; says: this matters, and I&rsquo;m not going to pretend it doesn&rsquo;t.
          </li>
          <li>
            <strong>Don&rsquo;t explain or philosophize.</strong> Skip &ldquo;everything happens for a reason&rdquo;
            and &ldquo;they&rsquo;re in a better place.&rdquo; These are about your comfort, not theirs.
          </li>
          <li>
            <strong>Date the card.</strong> It seems small, but a dated card becomes a keepsake.
          </li>
        </ul>

        <h2>What to avoid</h2>
        <p>Some phrases are well-intentioned but consistently land wrong:</p>
        <ul>
          <li>
            &ldquo;At least they had a good life.&rdquo; This is probably true, and it helps nobody right now.
          </li>
          <li>
            &ldquo;When are you getting a new one?&rdquo; Never say this. Not now. Not in a month. Let them bring it
            up.
          </li>
          <li>
            &ldquo;I know how you feel, my hamster died in 2009.&rdquo; Your empathy is real, but making it about
            your experience shifts the focus.
          </li>
          <li>
            &ldquo;They&rsquo;re in a better place.&rdquo; You may believe this sincerely. But in the first days of
            grief, &ldquo;better place&rdquo; sounds like &ldquo;better than being with you,&rdquo; even though
            that&rsquo;s not what you mean.
          </li>
          <li>
            &ldquo;Just a dog/cat.&rdquo; If someone says this to your friend, that person is not helping.
          </li>
        </ul>

        <h2>Beyond the card</h2>
        <p>
          A card is a starting point. If you want to do more, the{" "}
          <a href="/blog/pet-memorial-gifts">pet memorial gifts guide</a> has ideas that go beyond words: a framed
          photo you took, a donation in the pet&rsquo;s name, a meal delivered without asking. And if your friend is
          the kind of person who processes grief through writing, sharing the{" "}
          <a href="/blog/pet-loss-keepsake-ideas">pet loss keepsake ideas</a> article with them, when they&rsquo;re
          ready, might be welcome.
        </p>
        <p>
          The most important thing you can do isn&rsquo;t inside the card. It&rsquo;s following up in three weeks,
          when the first wave of support has passed and the quiet has set in. Say the pet&rsquo;s name again.
          That&rsquo;s when it matters most.
        </p>
      </ArticleLayout>
    </>
  );
}
