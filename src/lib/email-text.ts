/**
 * Plain-text alternative for an HTML email.
 *
 * Every send used to be HTML-only, which costs deliverability (spam filters
 * read a missing text/plain part as a signal) and leaves text-only clients with
 * nothing. Rather than maintain a second copy of twenty templates, the text
 * part is derived from the HTML that is already built.
 *
 * Deliberately simple: no HTML parser, the input is our own markup, not
 * arbitrary user documents. Dynamic values are escaped by the callers before
 * they reach the template, so unescaping entities here returns the original
 * text rather than injecting anything.
 */
export function htmlToText(html: string): string {
  const linked = html
    // Drop everything that carries no text.
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // The preheader is a duplicate of the subject line, not body copy.
    .replace(/<div style="display:none[\s\S]*?<\/div>/gi, "")
    // Keep link targets: "label (https://…)", so a CTA stays actionable.
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      if (!href || href.startsWith("#")) return text;
      return text ? `${text} (${href})` : href;
    })
    // Block-level elements become line breaks.
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|div|li|tr|td|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ");

  return linked
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&zwnj;|&#847;/gi, "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    // Collapse the whitespace the markup left behind.
    .split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n")
    .trim();
}
