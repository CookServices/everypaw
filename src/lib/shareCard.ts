/**
 * Generates a 1080×1080px social-share card using the Canvas API.
 * No server, no external deps — purely client-side.
 */

interface ShareCardParams {
  petName: string;
  petPhotoUrl: string | null;
  speciesEmoji: string;
  storyTitle: string;
  storyContent: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractExcerpt(content: string, maxSentences = 3): string {
  const sentenceRegex = /[^.!?…]+[.!?…]+["']?\s*/g;
  const sentences: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = sentenceRegex.exec(content)) !== null) {
    const s = match[0].trim();
    if (s.length > 10) {
      sentences.push(s);
      if (sentences.length === maxSentences) break;
    }
  }
  if (sentences.length > 0) return sentences.join(" ");
  // Fallback: hard truncate
  return content.length > 240 ? content.slice(0, 237) + "…" : content;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 5,
): number {
  const words = text.split(" ");
  let line = "";
  let y = startY;
  let linesDrawn = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (linesDrawn === maxLines - 1) {
        // Last allowed line — truncate with ellipsis
        let truncated = line;
        while (ctx.measureText(truncated + "…").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "…", cx, y);
        linesDrawn++;
        return y + lineHeight;
      }
      ctx.fillText(line, cx, y);
      linesDrawn++;
      y += lineHeight;
      line = word;
    } else {
      line = test;
    }
    if (linesDrawn >= maxLines) break;
  }
  if (line && linesDrawn < maxLines) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }
  return y;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    // Bust cache to avoid CORS cached opaque response
    img.src = src + (src.includes("?") ? "&" : "?") + "_cb=" + Date.now();
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Card generator ────────────────────────────────────────────────────────────

export async function generateShareCard(params: ShareCardParams): Promise<Blob> {
  const { petName, petPhotoUrl, speciesEmoji, storyTitle, storyContent } = params;

  const SIZE = 1080;
  const CX = SIZE / 2; // center x
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = "#3D2B1F";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle radial warm glow at top-center
  const glow = ctx.createRadialGradient(CX, 220, 0, CX, 220, 480);
  glow.addColorStop(0, "rgba(200,129,58,0.18)");
  glow.addColorStop(1, "rgba(200,129,58,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Bottom gradient for legibility
  const bottomGrad = ctx.createLinearGradient(0, 680, 0, SIZE);
  bottomGrad.addColorStop(0, "rgba(28,20,12,0)");
  bottomGrad.addColorStop(1, "rgba(28,20,12,0.55)");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 680, SIZE, SIZE - 680);

  // Decorative corner dots
  const dotPositions = [
    [72, 72], [SIZE - 72, 72],
    [72, SIZE - 72], [SIZE - 72, SIZE - 72],
  ];
  dotPositions.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200,129,58,0.35)";
    ctx.fill();
  });

  // ── Everypaw logo (top-left) ─────────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(72, 74, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#C8813A";
  ctx.fill();

  ctx.font = "600 34px Georgia, serif";
  ctx.fillStyle = "rgba(247,242,234,0.75)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Everypaw", 92, 74);

  // ── Pet photo circle ─────────────────────────────────────────────────────────
  const PHOTO_CX = CX;
  const PHOTO_CY = 320;
  const PHOTO_R = 190;

  // Ring
  ctx.beginPath();
  ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R + 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(200,129,58,0.5)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Photo or emoji placeholder
  let photoLoaded = false;
  if (petPhotoUrl) {
    try {
      const img = await loadImage(petPhotoUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R, 0, Math.PI * 2);
      ctx.clip();
      // Cover crop
      const aspect = img.naturalWidth / img.naturalHeight;
      let sw = img.naturalWidth, sh = img.naturalHeight;
      let sx = 0, sy = 0;
      if (aspect > 1) { sw = sh; sx = (img.naturalWidth - sh) / 2; }
      else { sh = sw; sy = (img.naturalHeight - sw) / 2; }
      const d = PHOTO_R * 2;
      ctx.drawImage(img, sx, sy, sw, sh, PHOTO_CX - PHOTO_R, PHOTO_CY - PHOTO_R, d, d);
      ctx.restore();
      photoLoaded = true;
    } catch {
      // CORS or load error — fall through to emoji
    }
  }

  if (!photoLoaded) {
    // Emoji placeholder circle
    ctx.beginPath();
    ctx.arc(PHOTO_CX, PHOTO_CY, PHOTO_R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200,129,58,0.15)";
    ctx.fill();

    ctx.font = `${PHOTO_R}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(speciesEmoji, PHOTO_CX, PHOTO_CY + 8);
  }

  // ── Pet name ─────────────────────────────────────────────────────────────────
  ctx.font = "bold 82px Georgia, serif";
  ctx.fillStyle = "#F7C27A";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Truncate name if too long
  let displayName = petName;
  while (ctx.measureText(displayName).width > SIZE - 160 && displayName.length > 1) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== petName) displayName += "…";

  ctx.fillText(displayName, CX, 580);

  // ── Story title (small, above excerpt) ──────────────────────────────────────
  ctx.font = "italic 32px Georgia, serif";
  ctx.fillStyle = "rgba(200,129,58,0.7)";
  ctx.textBaseline = "alphabetic";
  let displayTitle = storyTitle;
  while (ctx.measureText(displayTitle).width > SIZE - 200 && displayTitle.length > 1) {
    displayTitle = displayTitle.slice(0, -1);
  }
  if (displayTitle !== storyTitle) displayTitle += "…";
  ctx.fillText(displayTitle, CX, 628);

  // ── Decorative divider ────────────────────────────────────────────────────────
  const lineW = 200;
  const lineY = 648;
  ctx.beginPath();
  ctx.moveTo(CX - lineW / 2, lineY);
  ctx.lineTo(CX + lineW / 2, lineY);
  ctx.strokeStyle = "rgba(200,129,58,0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Story excerpt ─────────────────────────────────────────────────────────────
  const excerpt = extractExcerpt(storyContent, 3);

  ctx.font = "italic 37px Georgia, serif";
  ctx.fillStyle = "rgba(247,242,234,0.88)";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  wrapText(ctx, `"${excerpt}"`, CX, 702, SIZE - 180, 58, 5);

  // ── Bottom watermark ──────────────────────────────────────────────────────────
  ctx.font = "400 28px -apple-system, Helvetica Neue, sans-serif";
  ctx.fillStyle = "rgba(247,242,234,0.22)";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("everypaw.app", SIZE - 60, SIZE - 54);

  // Paw print left of watermark
  ctx.font = "28px serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(247,242,234,0.18)";
  ctx.fillText("🐾", 60, SIZE - 54);

  // ── Export ────────────────────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error("Canvas toBlob returned null"))),
      "image/png",
    );
  });
}

// ── Share / download ──────────────────────────────────────────────────────────

export async function shareOrDownloadCard(
  blob: Blob,
  petName: string,
  excerpt: string,
): Promise<void> {
  const filename = `${petName.toLowerCase().replace(/\s+/g, "-")}-everypaw.png`;
  const file = new File([blob], filename, { type: "image/png" });

  // Web Share API with file support (iOS Safari 15+, Android Chrome)
  if (
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: `${petName} – Everypaw`,
        text: excerpt,
      });
      return;
    } catch (err) {
      // AbortError = user cancelled intentionally, not an error
      if (err instanceof Error && err.name === "AbortError") return;
      // Otherwise fall through to download
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
