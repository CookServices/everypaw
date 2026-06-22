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

// ── Layout ──────────────────────────────────────────────────────────────────
// `footerExtra` renders one or more lines above the copyright line — use it for
// unsubscribe links or contextual promos.
export function baseLayout(content: string, footerExtra = "", lang: "fr" | "en" = "fr"): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- Header -->
        <tr><td style="background:${BRAND.headerBg};border-radius:16px 16px 0 0;padding:20px 32px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:1.2rem;font-weight:600;color:#FDFAF5;">
            🐾 Everypaw
          </span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border:1px solid rgba(61,43,31,.08);border-top:none;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:${BRAND.bg};border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;border:1px solid rgba(61,43,31,.08);border-top:none;">
          ${footerExtra ? `<p style="margin:0 0 8px;font-size:.75rem;color:${BRAND.muted};line-height:1.6;">${footerExtra}</p>` : ""}
          <p style="margin:0;font-size:.75rem;color:${BRAND.muted};">© ${year} Everypaw · <a href="https://everypaw.app" style="color:${BRAND.accent};text-decoration:none;">everypaw.app</a></p>
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

export function emoji(char: string): string {
  return `<p style="font-size:2rem;margin:0 0 8px;line-height:1;">${char}</p>`;
}

export function eyebrow(text: string): string {
  return `<p style="font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.accent};margin:0 0 12px;">${text}</p>`;
}

export function heading(html: string): string {
  return `<h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">${html}</h1>`;
}

export function paragraph(html: string): string {
  return `<p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 16px;">${html}</p>`;
}

export function quote(html: string): string {
  return `<div style="background:${BRAND.quoteBg};border-left:3px solid ${BRAND.accent};padding:16px 20px;border-radius:0 10px 10px 0;margin:0 0 24px;font-style:italic;font-size:1rem;line-height:1.65;color:${BRAND.text};">${html}</div>`;
}

export function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.accent};color:#FDFAF5;padding:14px 28px;border-radius:100px;text-decoration:none;font-family:inherit;font-size:.95rem;font-weight:500;margin:8px 0;">${label}</a>`;
}

export function ctaButtonOutline(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:transparent;color:${BRAND.accent};padding:12px 26px;border-radius:100px;border:1.5px solid ${BRAND.accent};text-decoration:none;font-family:inherit;font-size:.95rem;font-weight:500;margin:8px 0;">${label}</a>`;
}

export function codeBox(code: string): string {
  return `<div style="background:${BRAND.text};color:#F7C27A;font-family:monospace;font-size:1.5rem;padding:16px 24px;border-radius:12px;text-align:center;letter-spacing:.15em;margin:0 0 24px;">${code}</div>`;
}

export function finePrint(html: string): string {
  return `<p style="font-size:.78rem;color:${BRAND.faint};margin:16px 0 0;line-height:1.5;">${html}</p>`;
}

// Footer helper for an unsubscribe link (use as `footerExtra`).
export function unsubscribeLink(url: string, label: string): string {
  return `<a href="${url}" style="color:${BRAND.muted};text-decoration:underline;">${escapeHtml(label)}</a>`;
}
