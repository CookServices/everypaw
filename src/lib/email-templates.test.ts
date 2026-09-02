/**
 * Guards for the email layer.
 *
 * The regression that motivated most of these: sizes were expressed in `rem`,
 * which Outlook's Word engine ignores, so the type hierarchy silently
 * collapsed there. A unit is not something a smoke test catches.
 */
import { describe, it, expect } from "vitest";
import { baseLayout, preheader, oneClickUnsubscribeUrl, heading, paragraph, ctaButton } from "./email-templates";
import { htmlToText } from "./email-text";

describe("baseLayout", () => {
  it("sizes everything in px, never rem", () => {
    const html = baseLayout(heading("Titre") + paragraph("Corps") + ctaButton("https://everypaw.app", "Ouvrir"));

    expect(html).not.toMatch(/[0-9.]+rem/);
    expect(html).toMatch(/font-size:\d+px/);
  });

  it("declares a light color scheme so clients stop re-inverting the palette", () => {
    const html = baseLayout("<p>x</p>");

    expect(html).toContain('name="color-scheme"');
    expect(html).toContain('name="supported-color-schemes"');
  });

  it("carries the language on the html element", () => {
    expect(baseLayout("<p>x</p>", "", "en")).toContain('<html lang="en">');
    expect(baseLayout("<p>x</p>", "", "fr")).toContain('<html lang="fr">');
  });

  it("renders the preview line only when one is given", () => {
    expect(baseLayout("<p>x</p>", "", "fr", "Aperçu")).toContain("Aperçu");
    expect(baseLayout("<p>x</p>")).not.toContain("display:none;font-size:1px");
  });
});

describe("preheader", () => {
  it("hides the text from the open mail", () => {
    const html = preheader("Une question pour cette semaine");

    expect(html).toContain("display:none");
    expect(html).toContain("max-height:0");
  });

  it("escapes what it is given", () => {
    expect(preheader('<script>alert(1)</script>')).not.toContain("<script>");
  });
});

describe("oneClickUnsubscribeUrl", () => {
  it("points at the API route, not the confirmation page", () => {
    const url = oneClickUnsubscribeUrl("https://everypaw.app/unsubscribe?token=abc123");

    expect(url).toBe("https://everypaw.app/api/unsubscribe?token=abc123");
  });

  it("returns nothing when the profile has no token", () => {
    expect(oneClickUnsubscribeUrl("https://everypaw.app/dashboard")).toBeUndefined();
  });

  it("keeps only the token when other params follow", () => {
    expect(oneClickUnsubscribeUrl("https://everypaw.app/unsubscribe?token=abc&lang=fr"))
      .toBe("https://everypaw.app/api/unsubscribe?token=abc");
  });
});

describe("htmlToText", () => {
  it("keeps the link target next to its label, so a CTA stays usable", () => {
    const text = htmlToText(ctaButton("https://everypaw.app/dashboard", "Ouvrir mon journal"));

    expect(text).toBe("Ouvrir mon journal (https://everypaw.app/dashboard)");
  });

  it("drops the preview line, which would otherwise repeat the subject", () => {
    const html = baseLayout(paragraph("Corps du message"), "", "fr", "Ligne de preview");

    expect(htmlToText(html)).not.toContain("Ligne de preview");
    expect(htmlToText(html)).toContain("Corps du message");
  });

  it("unescapes entities back to their characters", () => {
    expect(htmlToText("<p>Caf&eacute; &amp; co &quot;test&quot;</p>")).toContain('& co "test"');
  });

  it("never leaves markup behind", () => {
    const text = htmlToText(baseLayout(heading("Titre") + paragraph("Corps") + ctaButton("https://x.test", "Go")));

    expect(text).not.toMatch(/<[a-z]/i);
    expect(text).not.toContain("style=");
  });

  it("collapses the run of blank lines the table markup leaves down to one", () => {
    // One empty line between blocks stays: it is what separates paragraphs in
    // a text/plain part. Runs of two or more are markup artefacts.
    expect(htmlToText("<p>un</p>\n\n\n<p>deux</p>")).toBe("un\n\ndeux");
  });
});
