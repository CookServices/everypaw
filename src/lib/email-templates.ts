import { escapeHtml } from "@/lib/html";

// ── Shared brand palette ────────────────────────────────────────────────────
export const BRAND = {
  bg: "#FDFAF5",
  headerBg: "#3D1F0D",
  accent: "#C8813A",
  text: "#3D2B1F",
  muted: "#7A5C44",
  faint: "#9A8070",
  quoteBg: "#F7F2EA",
};

// Sizes are in px on purpose. Outlook's Word rendering engine ignores `rem`,
// so every rem-sized rule silently fell back to the client default and the
// whole type hierarchy flattened out in one of the most used desktop clients.

// ── Layout ──────────────────────────────────────────────────────────────────
// `footerExtra` renders one or more lines above the copyright line — use it for
// unsubscribe links or contextual promos.
// `preheader` is the inbox preview line: shown next to the subject in the list,
// hidden once the mail is open. Without it, clients fall back to the first
// visible text, which here is always the "Everypaw" header.
export function baseLayout(content: string, footerExtra = "", lang: "fr" | "en" = "fr", preheaderText = ""): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};color:${BRAND.text};font-family:'DM Sans',Arial,Helvetica,sans-serif;">
  ${preheaderText ? preheader(preheaderText) : ""}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="${BRAND.bg}" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">
        <!-- Header -->
        <tr><td bgcolor="${BRAND.headerBg}" style="background:${BRAND.headerBg};border-radius:16px 16px 0 0;padding:20px 32px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:19px;font-weight:600;color:#FDFAF5;">
            🐾 Everypaw
          </span>
        </td></tr>
        <!-- Body -->
        <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:32px;border:1px solid rgba(61,43,31,.08);border-top:none;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td bgcolor="${BRAND.bg}" style="background:${BRAND.bg};border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;border:1px solid rgba(61,43,31,.08);border-top:none;">
          ${footerExtra ? `<p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};line-height:1.6;">${footerExtra}</p>` : ""}
          <p style="margin:0;font-size:12px;color:${BRAND.muted};">© ${year} Everypaw · <a href="https://everypaw.app" style="color:${BRAND.accent};text-decoration:none;">everypaw.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Content primitives ──────────────────────────────────────────────────────
// All helpers expect already-escaped/safe HTML for dynamic values, matching the
// existing call sites that escape pet names, excerpts, etc. before interpolation.

/**
 * Inbox preview line. Hidden in the open mail, read by the client's list view.
 * The trailing whitespace stops clients from padding the preview with whatever
 * markup follows.
 */
export function preheader(text: string): string {
  return `<div style="display:none;font-size:1px;color:${BRAND.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(text)}${"&#847;&zwnj;&nbsp;".repeat(30)}</div>`;
}

export function emoji(char: string): string {
  return `<p style="font-size:32px;margin:0 0 8px;line-height:1;">${char}</p>`;
}

export function eyebrow(text: string): string {
  return `<p style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.accent};margin:0 0 12px;">${text}</p>`;
}

export function heading(html: string): string {
  return `<h1 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:${BRAND.text};margin:0 0 12px;">${html}</h1>`;
}

export function paragraph(html: string): string {
  return `<p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 16px;">${html}</p>`;
}

export function quote(html: string): string {
  return `<div style="background:${BRAND.quoteBg};border-left:3px solid ${BRAND.accent};padding:16px 20px;border-radius:0 10px 10px 0;margin:0 0 24px;font-style:italic;font-size:16px;line-height:1.65;color:${BRAND.text};">${html}</div>`;
}

export function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.accent};color:#FDFAF5;padding:14px 28px;border-radius:100px;text-decoration:none;font-family:inherit;font-size:15px;font-weight:500;margin:8px 0;">${label}</a>`;
}

export function ctaButtonOutline(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:transparent;color:${BRAND.accent};padding:12px 26px;border-radius:100px;border:1.5px solid ${BRAND.accent};text-decoration:none;font-family:inherit;font-size:15px;font-weight:500;margin:8px 0;">${label}</a>`;
}

export function codeBox(code: string): string {
  return `<div style="background:${BRAND.text};color:#F7C27A;font-family:monospace;font-size:24px;padding:16px 24px;border-radius:12px;text-align:center;letter-spacing:.15em;margin:0 0 24px;">${code}</div>`;
}

export function finePrint(html: string): string {
  return `<p style="font-size:13px;color:${BRAND.faint};margin:16px 0 0;line-height:1.5;">${html}</p>`;
}

// Visual separators & sections
export function divider(): string {
  return `<div style="border-top:1px solid rgba(61,43,31,.12);margin:24px 0;"></div>`;
}

export function card(html: string, bgColor?: string): string {
  return `<div style="background:${bgColor || BRAND.quoteBg};border:1px solid rgba(61,43,31,.08);border-radius:12px;padding:20px 24px;margin:0 0 24px;">${html}</div>`;
}

export function colorSection(html: string, bgColor = BRAND.accent, textColor = "#FDFAF5"): string {
  return `<div style="background:${bgColor};color:${textColor};border-radius:12px;padding:20px 24px;margin:0 0 24px;font-size:15px;line-height:1.65;">${html}</div>`;
}

export function list(items: string[]): string {
  return `<ul style="font-size:14px;color:${BRAND.muted};line-height:1.75;margin:0 0 24px 24px;padding-left:0;">${items
    .map((item) => `<li style="margin-bottom:8px;">${item}</li>`)
    .join("")}</ul>`;
}

export function heroSection(emoji_char: string, heading_text: string): string {
  return `<div style="text-align:center;margin:0 0 24px;">
    <p style="font-size:40px;margin:0 0 12px;line-height:1;">${emoji_char}</p>
    <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:${BRAND.text};margin:0;letter-spacing:-.02em;">${heading_text}</h1>
  </div>`;
}

// Footer helper for an unsubscribe link (use as `footerExtra`).
export function unsubscribeLink(url: string, label: string): string {
  return `<a href="${url}" style="color:${BRAND.muted};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

/**
 * The machine-readable counterpart of the footer link, for the
 * List-Unsubscribe header: the API route rather than the confirmation page,
 * since mail clients post to it directly and never render a response.
 *
 * Derived from the page URL each cron already builds. A profile with no token
 * falls back to a plain dashboard link, which carries no token and therefore
 * yields no header at all, which is correct: there is nothing to unsubscribe.
 */
export function oneClickUnsubscribeUrl(pageUrl: string): string | undefined {
  const token = pageUrl.includes("token=") ? pageUrl.split("token=")[1]?.split("&")[0] : null;
  return token ? `https://everypaw.app/api/unsubscribe?token=${token}` : undefined;
}
