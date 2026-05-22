import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

function calcPageCount(storiesCount: number, hasPhotos: boolean, hasDedication: boolean): number {
  // 1 cover + 1 back cover + stories + optional dedication + optional photos page
  const total = 2 + (hasDedication ? 1 : 0) + storiesCount + (hasPhotos ? 1 : 0);
  const rounded = total % 2 === 0 ? total : total + 1; // must be even
  return Math.max(20, rounded); // Gelato minimum 20 pages
}

const STRINGS = {
  en: {
    coverTitle: "The Life of",
    brand: "An Everypaw Book",
    chapter: "Chapter",
    moments: "Moments",
    dedication: "A message from your family",
    noStories: (name: string) => `No stories yet. Add journal entries and generate ${name}'s first story.`,
    backTitle: "Every moment remembered.",
    backText: "This book was created with love using Everypaw — the AI journal that turns your pet's daily moments into stories worth keeping forever.",
    birthdate: (d: Date) => `Born ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
  },
  fr: {
    coverTitle: "La Vie de",
    brand: "Un Livre Everypaw",
    chapter: "Chapitre",
    moments: "Souvenirs",
    dedication: "Un message de votre famille",
    noStories: (name: string) => `Aucune histoire pour l'instant. Ajoutez des entrées et générez la première histoire de ${name}.`,
    backTitle: "Chaque moment, à jamais.",
    backText: "Ce livre a été créé avec amour grâce à Everypaw — le journal IA qui transforme les moments du quotidien de votre animal en histoires à garder pour toujours.",
    birthdate: (d: Date) => `Né(e) le ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
  },
};

export async function GET(req: Request) {
  const supabase = getServiceClient();

  const url = new URL(req.url);
  const petId = url.searchParams.get("petId");
  const lang = (url.searchParams.get("lang") ?? "en") as "en" | "fr";
  const storyIdsParam = url.searchParams.get("storyIds");
  const dedication = url.searchParams.get("dedication")
    ? decodeURIComponent(url.searchParams.get("dedication")!)
    : "";
  const yearParam = url.searchParams.get("year");
  const yearFilter = yearParam ? parseInt(yearParam, 10) : null;
  const coverPhotoParam = url.searchParams.get("coverPhoto")
    ? decodeURIComponent(url.searchParams.get("coverPhoto")!)
    : null;

  const s = STRINGS[lang] ?? STRINGS.en;

  if (!petId) {
    return NextResponse.json({ error: "petId required" }, { status: 400 });
  }

  const [{ data: pet }, { data: allStories }, { data: allEntries }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", petId).single(),
    supabase.from("stories").select("*").eq("pet_id", petId).order("created_at", { ascending: true }),
    supabase.from("entries").select("*").eq("pet_id", petId).order("entry_date", { ascending: true }),
  ]);

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });

  // Filter stories by storyIds if provided
  let stories = allStories ?? [];
  if (storyIdsParam) {
    const ids = storyIdsParam.split(",").filter(Boolean);
    stories = stories.filter(story => ids.includes(story.id));
  }

  // Filter by year if provided
  if (yearFilter) {
    stories = stories.filter(story => {
      const d = new Date(story.period_start ?? story.created_at);
      return d.getFullYear() === yearFilter;
    });
  }

  // Filter entries by year if provided
  const entries = yearFilter
    ? (allEntries ?? []).filter(e => new Date(e.entry_date).getFullYear() === yearFilter)
    : (allEntries ?? []);

  const photosWithEntries = entries.filter(e => e.photo_urls?.length > 0).slice(0, 6);
  const hasPhotos = photosWithEntries.length > 0;
  const hasDedication = dedication.trim().length > 0;

  const _pageCount = calcPageCount(stories.length, hasPhotos, hasDedication);

  const birthdateHtml = pet.birthdate
    ? `<div class="cover-subtitle">${escapeHtml(s.birthdate(new Date(pet.birthdate)))}</div>`
    : "";

  const coverStyle =
    coverPhotoParam && safeUrl(coverPhotoParam)
      ? `background: linear-gradient(rgba(61,43,31,.7), rgba(61,43,31,.85)), url('${safeUrl(coverPhotoParam)}') center/cover no-repeat;`
      : `background: #3D2B1F;`;

  const dedicationPage = hasDedication
    ? `
  <div class="dedication">
    <div class="dedication-label">${escapeHtml(s.dedication)}</div>
    <div class="dedication-text">${escapeHtml(dedication).replace(/\n/g, "<br>")}</div>
  </div>
  `
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', sans-serif; background: #F7F2EA; color: #3D2B1F; }
    .cover { width: 100%; min-height: 100vh; ${coverStyle} display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 3rem; page-break-after: always; }
    .cover-paw { font-size: 4rem; margin-bottom: 2rem; }
    .cover-title { font-family: 'Playfair Display', serif; font-size: 3rem; font-weight: 600; color: #F7C27A; line-height: 1.2; margin-bottom: 1rem; }
    .cover-subtitle { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.25rem; color: rgba(247,242,234,.6); margin-bottom: 3rem; }
    .cover-line { width: 60px; height: 2px; background: #C8813A; margin: 0 auto 3rem; }
    .cover-brand { font-size: .875rem; color: rgba(247,242,234,.4); letter-spacing: .1em; text-transform: uppercase; }
    .dedication { padding: 4rem 3rem; page-break-after: always; background: #F7F2EA; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; }
    .dedication-label { font-size: .75rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: #C8813A; margin-bottom: 1.5rem; }
    .dedication-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.15rem; line-height: 1.85; color: #3D2B1F; max-width: 480px; }
    .chapter { padding: 4rem 3rem; page-break-after: always; background: #FDFAF5; }
    .chapter-num { font-size: .75rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: #C8813A; margin-bottom: 1rem; }
    .chapter-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 600; color: #3D2B1F; margin-bottom: 2rem; line-height: 1.3; }
    .chapter-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.05rem; line-height: 1.9; color: #3D2B1F; }
    .photo-page { padding: 2rem; background: #F7F2EA; page-break-after: always; }
    .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .photo-grid img { width: 100%; height: 220px; object-fit: cover; border-radius: 12px; }
    .photo-caption { font-size: .8rem; color: #7A5C44; margin-top: .5rem; font-style: italic; }
    .back-cover { width: 100%; min-height: 100vh; background: #C8813A; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem; }
    .back-cover-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #FDFAF5; margin-bottom: 1rem; }
    .back-cover-text { font-size: .9rem; color: rgba(253,250,245,.7); max-width: 360px; line-height: 1.7; }
  </style>
</head>
<body>

  <!-- Cover -->
  <div class="cover">
    <div class="cover-paw">🐾</div>
    <div class="cover-title">${escapeHtml(s.coverTitle)}<br>${escapeHtml(pet.name)}</div>
    ${birthdateHtml}
    <div class="cover-line"></div>
    <div class="cover-brand">${escapeHtml(s.brand)}</div>
  </div>

  <!-- Dedication page -->
  ${dedicationPage}

  <!-- Stories as chapters -->
  ${stories.length > 0 ? stories.map((story, i) => `
  <div class="chapter">
    <div class="chapter-num">${escapeHtml(s.chapter)} ${i + 1}</div>
    <div class="chapter-title">${escapeHtml(story.title || `${pet.name}'s Story`)}</div>
    <div class="chapter-text">${escapeHtml(story.content).replace(/\n/g, "<br>")}</div>
  </div>
  `).join("") : `
  <div class="chapter">
    <div class="chapter-num">${escapeHtml(s.chapter)} 1</div>
    <div class="chapter-title">The story begins…</div>
    <div class="chapter-text" style="font-style: normal; color: #7A5C44; font-size: .95rem;">
      ${escapeHtml(s.noStories(pet.name))}
    </div>
  </div>
  `}

  <!-- Photos page -->
  ${hasPhotos ? `
  <div class="photo-page">
    <div class="chapter-num" style="margin-bottom: 1.5rem;">${escapeHtml(s.moments)}</div>
    <div class="photo-grid">
      ${photosWithEntries.flatMap(e => e.photo_urls.slice(0, 1)).map((url: string) => `
        <div>
          ${safeUrl(url) ? `<img src="${safeUrl(url)}" alt="" />` : ""}
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}

  <!-- Back cover -->
  <div class="back-cover">
    <div class="back-cover-title">${escapeHtml(s.backTitle)}</div>
    <div class="back-cover-text">${escapeHtml(s.backText)}</div>
    <div style="margin-top: 2rem; font-size: .8rem; color: rgba(253,250,245,.5); letter-spacing: .1em; text-transform: uppercase;">everypaw.app</div>
  </div>

</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
