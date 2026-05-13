import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { petId } = await req.json();

  const [{ data: pet }, { data: stories }, { data: entries }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", petId).single(),
    supabase.from("stories").select("*").eq("pet_id", petId).order("created_at", { ascending: true }),
    supabase.from("entries").select("*").eq("pet_id", petId).order("entry_date", { ascending: true }),
  ]);

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const photosWithEntries = entries?.filter(e => e.photo_urls?.length > 0).slice(0, 6) || [];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', sans-serif; background: #F7F2EA; color: #3D2B1F; }
    .cover { width: 100%; min-height: 100vh; background: #3D2B1F; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 3rem; page-break-after: always; }
    .cover-paw { font-size: 4rem; margin-bottom: 2rem; }
    .cover-title { font-family: 'Playfair Display', serif; font-size: 3rem; font-weight: 600; color: #F7C27A; line-height: 1.2; margin-bottom: 1rem; }
    .cover-subtitle { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.25rem; color: rgba(247,242,234,.6); margin-bottom: 3rem; }
    .cover-line { width: 60px; height: 2px; background: #C8813A; margin: 0 auto 3rem; }
    .cover-brand { font-size: .875rem; color: rgba(247,242,234,.4); letter-spacing: .1em; text-transform: uppercase; }
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
    <div class="cover-title">The Life of<br>${escapeHtml(pet.name)}</div>
    ${pet.birthdate ? `<div class="cover-subtitle">Born ${new Date(pet.birthdate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>` : ""}
    <div class="cover-line"></div>
    <div class="cover-brand">An Everypaw Book</div>
  </div>

  <!-- Stories as chapters -->
  ${stories && stories.length > 0 ? stories.map((story, i) => `
  <div class="chapter">
    <div class="chapter-num">Chapter ${i + 1}</div>
    <div class="chapter-title">${escapeHtml(story.title || `${pet.name}'s Story`)}</div>
    <div class="chapter-text">${escapeHtml(story.content).replace(/\n/g, "<br>")}</div>
  </div>
  `).join("") : `
  <div class="chapter">
    <div class="chapter-num">Chapter 1</div>
    <div class="chapter-title">The story begins…</div>
    <div class="chapter-text" style="font-style: normal; color: #7A5C44; font-size: .95rem;">
      No stories generated yet. Add journal entries and generate ${pet.name}'s first story to see it appear in this book.
    </div>
  </div>
  `}

  <!-- Photos page -->
  ${photosWithEntries.length > 0 ? `
  <div class="photo-page">
    <div class="chapter-num" style="margin-bottom: 1.5rem;">Moments</div>
    <div class="photo-grid">
      ${photosWithEntries.flatMap(e => e.photo_urls.slice(0, 1)).map((url: string, i: number) => `
        <div>
          ${safeUrl(url) ? `<img src="${safeUrl(url)}" alt="" />` : ""}
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}

  <!-- Back cover -->
  <div class="back-cover">
    <div class="back-cover-title">Every moment remembered.</div>
    <div class="back-cover-text">This book was created with love using Everypaw — the AI journal that turns your pet's daily moments into stories worth keeping forever.</div>
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
