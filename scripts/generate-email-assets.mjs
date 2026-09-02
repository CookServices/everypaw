/**
 * Renders the PNG assets the emails need, from the SVG sources already in the
 * repo. Email clients do not render SVG (Gmail strips it outright), so every
 * illustration has to ship as a bitmap.
 *
 * Run with `node scripts/generate-email-assets.mjs` after changing a source
 * SVG. Output is committed: emails reference it by absolute URL.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import sharp from "sharp";

const OUT = "public/email";
mkdirSync(OUT, { recursive: true });

// Illustrations, drawn at 2x their display size (120px in the mail).
const ILLUSTRATIONS = ["paw", "book", "star", "heart", "bone", "plant"];

// The landing illustrations are drawn in their own warmer orange, on the cream
// of the marketing pages. In a mail they sit next to a terracotta button, on a
// cream disc, so the two brand colours are substituted at render time rather
// than maintaining a second set of SVG sources.
const RECOLOR = [
  [/#F09A0C/gi, "#C8813A"], // illustration orange -> brand accent
  [/#FAF0D7/gi, "#F7F2EA"], // cream outline -> the disc it sits on
];

for (const name of ILLUSTRATIONS) {
  let source = readFileSync(`public/illustrations/${name}.svg`, "utf8");
  for (const [from, to] of RECOLOR) source = source.replace(from, to);
  const svg = Buffer.from(source);
  await sharp(svg, { density: 300 })
    .resize(240, 240, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${OUT}/illus-${name}.png`);
  console.log(`${OUT}/illus-${name}.png`);
}

// The header mark: the logo's paw, without its rounded-square background, so it
// sits on the dark header instead of drawing a second panel on top of it.
const logo = readFileSync("docs/logo-everypaw.svg", "utf8");
const pawOnly = logo.replace(/<rect[^>]*\/>/, "");
await sharp(Buffer.from(pawOnly), { density: 300 })
  .resize(96, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(`${OUT}/paw-mark.png`);
console.log(`${OUT}/paw-mark.png`);
