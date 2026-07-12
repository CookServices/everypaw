import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPost } from "@/lib/blog";

const post = getPost("pet-journal-prompts")!;

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
        {/* Placeholder structure — fill each section with content, then set published: true in src/lib/blog.ts */}
        <h2>Why journaling prompts help</h2>
        <p>Content coming soon.</p>

        <h2>Everyday prompts</h2>
        <p>Content coming soon.</p>

        <h2>Milestone prompts</h2>
        <p>Content coming soon.</p>

        <h2>Turning prompts into a keepsake</h2>
        <p>Content coming soon.</p>
      </ArticleLayout>
    </>
  );
}
