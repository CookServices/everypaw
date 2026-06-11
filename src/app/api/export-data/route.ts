import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  birthdate: string | null;
  bio: string | null;
  deceased_at: string | null;
  memorial_message: string | null;
  created_at: string;
}

interface Entry {
  id: string;
  pet_id: string;
  content: string;
  mood: string | null;
  tags: string[] | null;
  entry_date: string;
  created_at: string;
}

interface Story {
  id: string;
  pet_id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface Milestone {
  id: string;
  pet_id: string;
  type: string;
  title: string;
  achieved_at: string | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ", ";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function speciesEmoji(species: string | null): string {
  if (!species) return "🐾";
  const s = species.toLowerCase();
  if (s === "dog" || s === "chien") return "🐶";
  if (s === "cat" || s === "chat") return "🐱";
  return "🐾";
}

// ── HTML builder ───────────────────────────────────────────────────────────────

function buildHtml(params: {
  profile: Record<string, unknown> | null;
  pets: Pet[];
  entries: Entry[];
  stories: Story[];
  milestones: Milestone[];
  exportedAt: string;
}): string {
  const { profile, pets, entries, stories, milestones, exportedAt } = params;

  const petSections = pets.map((pet) => {
    const petEntries = entries.filter((e) => e.pet_id === pet.id);
    const petStories = stories.filter((s) => s.pet_id === pet.id);
    const petMilestones = milestones.filter((m) => m.pet_id === pet.id);

    const entriesHtml = petEntries.length === 0
      ? `<p class="empty">Aucune entrée.</p>`
      : petEntries.map((e) => `
        <div class="entry">
          <div class="entry-date">${escapeHtml(fmtDate(e.entry_date))}${e.mood ? ` · ${escapeHtml(e.mood)}` : ""}</div>
          <div class="entry-content">${escapeHtml(e.content ?? "")}</div>
          ${e.tags && e.tags.length > 0 ? `<div class="tags">${e.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        </div>`).join("");

    const storiesHtml = petStories.length === 0
      ? `<p class="empty">Aucune histoire générée.</p>`
      : petStories.map((s) => `
        <div class="story">
          <h4>${escapeHtml(s.title)}</h4>
          <div class="story-date">${escapeHtml(fmtDate(s.created_at))}</div>
          <div class="story-content">${escapeHtml(s.content ?? "").replace(/\n/g, "<br>")}</div>
        </div>`).join("");

    const milestonesHtml = petMilestones.length === 0
      ? `<p class="empty">Aucune étape.</p>`
      : `<ul class="milestones">${petMilestones.map((m) => `<li><strong>${escapeHtml(m.title)}</strong>${m.achieved_at ? `, ${escapeHtml(fmtDate(m.achieved_at))}` : ""}</li>`).join("")}</ul>`;

    return `
    <section class="pet-section">
      <div class="pet-header">
        <span class="pet-emoji">${speciesEmoji(pet.species)}</span>
        <div>
          <h2>${escapeHtml(pet.name)}</h2>
          <div class="pet-meta">
            ${pet.species ? escapeHtml(pet.species) : ""}
            ${pet.breed ? ` · ${escapeHtml(pet.breed)}` : ""}
            ${pet.birthdate ? ` · Né(e) le ${escapeHtml(fmtDate(pet.birthdate))}` : ""}
            ${pet.deceased_at ? ` · ✝ ${escapeHtml(fmtDate(pet.deceased_at))}` : ""}
          </div>
          ${pet.bio ? `<p class="pet-bio">${escapeHtml(pet.bio)}</p>` : ""}
        </div>
      </div>

      <h3>📔 Journal (${petEntries.length} entrée${petEntries.length !== 1 ? "s" : ""})</h3>
      ${entriesHtml}

      <h3>✨ Histoires IA (${petStories.length})</h3>
      ${storiesHtml}

      <h3>🏅 Étapes (${petMilestones.length})</h3>
      ${milestonesHtml}
    </section>`;
  }).join("<hr class='pet-divider'>");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mes données Everypaw, ${escapeHtml(fmtDate(exportedAt))}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      background: #F7F2EA;
      color: #3D2B1F;
      padding: 2rem 1rem;
      line-height: 1.6;
    }
    .container { max-width: 760px; margin: 0 auto; }

    /* Header */
    .site-header {
      text-align: center;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #D4C5B0;
    }
    .logo { font-family: Georgia, serif; font-size: 1.6rem; font-weight: 600; color: #3D2B1F; }
    .logo-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #C8813A; margin-right: .4rem; vertical-align: middle; }
    .export-meta { font-size: .8rem; color: #9A8070; margin-top: .5rem; }

    /* Profile card */
    .profile-card {
      background: #FDFAF5;
      border: 1px solid rgba(61,43,31,.1);
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 2rem;
    }
    .profile-card h2 { font-family: Georgia, serif; font-size: 1rem; margin-bottom: .75rem; color: #7A5C44; }
    .profile-row { display: flex; gap: .5rem; font-size: .875rem; margin-bottom: .25rem; }
    .profile-label { color: #9A8070; min-width: 140px; }

    /* Pet sections */
    .pet-section { margin-bottom: 2rem; }
    .pet-header { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1.5rem; background: #FDFAF5; border: 1px solid rgba(61,43,31,.1); border-radius: 16px; padding: 1.25rem; }
    .pet-emoji { font-size: 2.5rem; flex-shrink: 0; }
    .pet-header h2 { font-family: Georgia, serif; font-size: 1.3rem; margin-bottom: .25rem; }
    .pet-meta { font-size: .8rem; color: #7A5C44; margin-bottom: .5rem; }
    .pet-bio { font-size: .875rem; color: #7A5C44; font-style: italic; margin-top: .5rem; }

    h3 { font-family: Georgia, serif; font-size: 1rem; font-weight: 600; color: #3D2B1F; margin: 1.5rem 0 .75rem; border-left: 3px solid #C8813A; padding-left: .625rem; }

    /* Entries */
    .entry { background: #FDFAF5; border: 1px solid rgba(61,43,31,.08); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: .75rem; }
    .entry-date { font-size: .75rem; color: #9A8070; margin-bottom: .4rem; text-transform: capitalize; }
    .entry-content { font-size: .9rem; white-space: pre-wrap; }
    .tags { margin-top: .5rem; display: flex; flex-wrap: wrap; gap: .25rem; }
    .tag { background: rgba(200,129,58,.12); color: #7A5C44; font-size: .72rem; padding: 2px 8px; border-radius: 100px; }

    /* Stories */
    .story { background: #FDFAF5; border: 1px solid rgba(61,43,31,.08); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: .75rem; }
    .story h4 { font-family: Georgia, serif; font-size: 1rem; margin-bottom: .25rem; }
    .story-date { font-size: .75rem; color: #9A8070; margin-bottom: .625rem; }
    .story-content { font-size: .875rem; line-height: 1.7; }

    /* Milestones */
    .milestones { padding-left: 1.25rem; }
    .milestones li { font-size: .875rem; margin-bottom: .375rem; }

    .empty { font-size: .875rem; color: #9A8070; font-style: italic; }
    hr.pet-divider { border: none; border-top: 1px dashed #D4C5B0; margin: 2.5rem 0; }

    /* Footer */
    .export-footer { text-align: center; font-size: .75rem; color: #9A8070; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #D4C5B0; }

    @media print {
      body { background: white; }
      .pet-header, .profile-card, .entry, .story { break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="container">

  <header class="site-header">
    <div class="logo"><span class="logo-dot"></span>Everypaw</div>
    <div class="export-meta">Export de vos données · ${escapeHtml(fmtDate(exportedAt))}</div>
  </header>

  <div class="profile-card">
    <h2>Mon profil</h2>
    <div class="profile-row"><span class="profile-label">Email</span><span>${escapeHtml(String(profile?.email ?? ", "))}</span></div>
    <div class="profile-row"><span class="profile-label">Nom</span><span>${escapeHtml(String(profile?.full_name ?? ", "))}</span></div>
    <div class="profile-row"><span class="profile-label">Plan</span><span>${escapeHtml(String(profile?.plan ?? "free"))}</span></div>
    <div class="profile-row"><span class="profile-label">Membre depuis</span><span>${escapeHtml(fmtDate(String(profile?.created_at ?? "")))}</span></div>
  </div>

  ${pets.length === 0
    ? `<p class="empty">Aucun animal enregistré.</p>`
    : petSections}

  <footer class="export-footer">
    Généré par everypaw.app · ${escapeHtml(new Date(exportedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }))}
  </footer>

</div>
</body>
</html>`;
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = checkRateLimit(`export:${user.id}`, 3, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const format = new URL(req.url).searchParams.get("format"); // "html" | null (= json)
  const uid = user.id;

  const [
    { data: profile },
    { data: pets },
    { data: entries },
    { data: stories },
    { data: milestones },
    { data: bookConfigs },
  ] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, plan, is_premium, book_credits, email_reminders, onboarding_completed, created_at").eq("id", uid).single(),
    supabase.from("pets").select("id, name, species, breed, birthdate, bio, deceased_at, memorial_message, created_at").eq("user_id", uid),
    supabase.from("entries").select("id, pet_id, content, photo_urls, mood, tags, entry_date, created_at").eq("user_id", uid).order("entry_date", { ascending: false }),
    supabase.from("stories").select("id, pet_id, title, content, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
    supabase.from("milestones").select("id, pet_id, type, title, achieved_at, created_at").eq("user_id", uid),
    supabase.from("book_configs").select("id, pet_id, name, status, theme, custom_title, year_filter, dedication_text, page_count, created_at").eq("user_id", uid),
  ]);

  const exportedAt = new Date().toISOString();
  const dateSlug = exportedAt.slice(0, 10);

  // ── HTML export ──────────────────────────────────────────────────────────────
  if (format === "html") {
    const html = buildHtml({
      profile: profile as Record<string, unknown> | null,
      pets: (pets ?? []) as Pet[],
      entries: (entries ?? []) as Entry[],
      stories: (stories ?? []) as Story[],
      milestones: (milestones ?? []) as Milestone[],
      exportedAt,
    });
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="everypaw-donnees-${dateSlug}.html"`,
      },
    });
  }

  // ── JSON export (default) ────────────────────────────────────────────────────
  const payload = {
    exported_at: exportedAt,
    profile,
    pets: pets ?? [],
    journal_entries: entries ?? [],
    ai_stories: stories ?? [],
    milestones: milestones ?? [],
    book_configs: bookConfigs ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="everypaw-data-${dateSlug}.json"`,
    },
  });
}
