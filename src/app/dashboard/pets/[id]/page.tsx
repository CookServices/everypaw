"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry, Story } from "@/types";
import Link from "next/link";
import { detectMilestones } from "@/lib/milestones";
import { useLocale } from "@/hooks/useLocale";
import { generateShareCard, shareOrDownloadCard } from "@/lib/shareCard";

const MOOD_OPTIONS = [
  { value: "happy", emoji: "😄", label: "Happy" },
  { value: "funny", emoji: "😂", label: "Funny" },
  { value: "tender", emoji: "🥰", label: "Tender" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "proud", emoji: "🏆", label: "Proud" },
];

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 1200;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = (height / width) * maxSize; width = maxSize; }
        else { width = (width / height) * maxSize; height = maxSize; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function groupEntriesByMonth(entries: Entry[], locale: string) {
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
  const groups: { month: string; entries: Entry[] }[] = [];
  entries.forEach(entry => {
    const month = new Date(entry.entry_date).toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
    const existing = groups.find(g => g.month === month);
    if (existing) existing.entries.push(entry);
    else groups.push({ month, entries: [entry] });
  });
  return groups;
}

export default function PetPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t, locale } = useLocale();
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  const [pet, setPet] = useState<Pet | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [milestones, setMilestones] = useState<{ id: string; type: string; title: string; achieved_at: string }[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [mood, setMood] = useState("happy");
  const [tab, setTab] = useState<"journal" | "stories" | "milestones">("journal");
  const [moodFilter, setMoodFilter] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "stories" || tabParam === "milestones") setTab(tabParam);
  }, []);
  const [saving, setSaving] = useState(false);
  const [entryError, setEntryError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [newMilestone, setNewMilestone] = useState<{ type: string; title: string } | null>(null);
  const [showMemorialModal, setShowMemorialModal] = useState(false);
  const [deceasedAt, setDeceasedAt] = useState("");
  const [memorialMessage, setMemorialMessage] = useState("");
  const [savingMemorial, setSavingMemorial] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPet, setDeletingPet] = useState(false);
  const [sharingStoryId, setSharingStoryId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kebabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setShowKebabMenu(false);
        setShowDeleteConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: petData }, { data: entriesData }, { data: storiesData }, { data: milestonesData }, { data: profile }] = await Promise.all([
        supabase.from("pets").select("*").eq("id", id).single(),
        supabase.from("entries").select("*").eq("pet_id", id).order("entry_date", { ascending: false }),
        supabase.from("stories").select("*").eq("pet_id", id).order("created_at", { ascending: false }),
        supabase.from("milestones").select("*").eq("pet_id", id).order("achieved_at", { ascending: false }),
        supabase.from("profiles").select("is_premium").single(),
      ]);
      setPet(petData);
      setEntries(entriesData || []);
      setStories(storiesData || []);
      setMilestones(milestonesData || []);
      setIsPremium(profile?.is_premium ?? false);
      setLoading(false);
    };
    load();
  }, [id]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - pendingPhotos.length;
    const selected = files.slice(0, remaining);
    const newPhotos = selected.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPendingPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPendingPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    const supabase = createClient();
    const urls: string[] = [];
    for (const { file } of pendingPhotos) {
      const compressed = await compressImage(file);
      const filename = `${userId}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("pet-photos").upload(filename, compressed, { contentType: "image/jpeg" });
      if (!error) {
        const { data } = supabase.storage.from("pet-photos").getPublicUrl(filename);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const addEntry = async () => {
    if (!newEntry.trim() && pendingPhotos.length === 0) {
      setEntryError(true);
      return;
    }
    setSaving(true);
    setUploadingPhotos(pendingPhotos.length > 0);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let photoUrls: string[] = [];
    if (pendingPhotos.length > 0) photoUrls = await uploadPhotos(user!.id);

    const { data } = await supabase.from("entries").insert({
      pet_id: id, user_id: user!.id,
      content: newEntry.trim() || " ", mood, photo_urls: photoUrls,
    }).select().single();

    if (data) {
      const newEntries = [data, ...entries];
      setEntries(newEntries);

      if (!isPremium && newEntries.length >= 10) {
        const UPSELL_KEY = "ep_upsell_shown";
        const lastShown = localStorage.getItem(UPSELL_KEY);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (!lastShown || Date.now() - Number(lastShown) > sevenDays) {
          setShowUpsellModal(true);
          localStorage.setItem(UPSELL_KEY, String(Date.now()));
        }
      }

      const existingMilestoneTypes = milestones.map(m => m.type);
      const detected = detectMilestones({ content: newEntry }, entries, existingMilestoneTypes);

      for (const milestone of detected) {
        const { data: savedMilestone } = await supabase.from("milestones").insert({
          pet_id: id, user_id: user!.id,
          type: milestone.type, title: milestone.title,
          entry_id: data.id,
        }).select().single();
        if (savedMilestone) {
          setMilestones(prev => [savedMilestone, ...prev]);
          setNewMilestone(milestone);
          setTimeout(() => setNewMilestone(null), 4000);
        }
      }
    }

    setNewEntry("");
    setPendingPhotos([]);
    setUploadingPhotos(false);
    setSaving(false);
  };

  const generateStory = async () => {
    if (entries.length < 3) { alert(t.journal.min_entries_alert); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: id, petName: pet?.name, species: pet?.species, bio: pet?.bio, entries: entries.slice(0, 20) }),
      });
      const data = await res.json();
      if (data.story) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: saved } = await supabase.from("stories").insert({
          pet_id: id, user_id: user!.id, content: data.story, title: data.title,
          period_start: entries[entries.length - 1]?.entry_date,
          period_end: entries[0]?.entry_date,
        }).select().single();
        if (saved) setStories([saved, ...stories]);
        setTab("stories");
      }
    } catch { alert(t.journal.generation_failed); }
    setGenerating(false);
  };

  const handleShare = async (story: Story) => {
    if (!pet) return;
    setSharingStoryId(story.id);
    try {
      const blob = await generateShareCard({
        petName: pet.name,
        petPhotoUrl: pet.photo_url,
        speciesEmoji: SPECIES_EMOJI[pet.species] ?? "🐾",
        storyTitle: story.title || `${pet.name}'s Story`,
        storyContent: story.content,
      });
      await shareOrDownloadCard(blob, pet.name, story.content.slice(0, 140));
    } catch {
      alert(t.stories.share_error);
    }
    setSharingStoryId(null);
  };

  const deletePet = async () => {
    setDeletingPet(true);
    const supabase = createClient();
    await supabase.from("entries").delete().eq("pet_id", id);
    await supabase.from("stories").delete().eq("pet_id", id);
    await supabase.from("milestones").delete().eq("pet_id", id);
    await supabase.from("pets").delete().eq("id", id);
    window.location.href = "/dashboard";
  };

  const saveMemorial = async () => {
    if (!deceasedAt) return;
    setSavingMemorial(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("pets")
      .update({ deceased_at: deceasedAt, memorial_message: memorialMessage || null })
      .eq("id", id)
      .select()
      .single();
    if (data) setPet(data);
    setSavingMemorial(false);
    setShowMemorialModal(false);
  };

  const handlePreviewPDF = async () => {
    setPreviewLoading(true);
    const res = await fetch("/api/preview-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petId: id }),
    });
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setPreviewLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#7A5C44" }}>{t.dashboard.loading}</div>
  );
  if (!pet) return <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center" }}>{t.pet.not_found}</div>;

  const filteredEntries = moodFilter ? entries.filter(e => e.mood === moodFilter) : entries;
  const groupedEntries = groupEntriesByMonth(filteredEntries, locale);
  const isFR = locale === "fr";

  const tabs = [
    { key: "journal" as const, label: t.pet.tab_journal },
    { key: "stories" as const, label: isFR ? "Histoires IA" : "AI Stories" },
    { key: "milestones" as const, label: t.pet.tab_milestones },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Milestone notification */}
      {newMilestone && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "#3D2B1F", color: "#FDFAF5", padding: "1rem 1.5rem", borderRadius: 100, fontSize: ".9rem", fontWeight: 500, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: ".75rem", whiteSpace: "nowrap" }}>
          🏆 {t.milestones.new_notification.replace("{title}", newMilestone.title)}
        </div>
      )}

      {/* Memorial modal */}
      {showMemorialModal && (
        <div onClick={() => setShowMemorialModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(28,20,16,.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🕊️</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .4rem" }}>{t.memorial.modal_title.replace("{name}", pet.name)}</h2>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, margin: 0 }}>{t.memorial.modal_subtitle}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>{t.memorial.date_label}</label>
                <input type="date" value={deceasedAt} onChange={e => setDeceasedAt(e.target.value)} style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>{t.memorial.message_label}</label>
                <textarea value={memorialMessage} onChange={e => setMemorialMessage(e.target.value)} placeholder={t.memorial.message_placeholder} rows={3} style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none", resize: "none", boxSizing: "border-box" as const, lineHeight: 1.6 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: ".75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setShowMemorialModal(false)} style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".875rem", color: "#7A5C44", cursor: "pointer" }}>
                {t.memorial.cancel}
              </button>
              <button onClick={saveMemorial} disabled={savingMemorial || !deceasedAt} style={{ flex: 2, padding: ".75rem", borderRadius: 100, border: "none", background: "#8B6B4A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: savingMemorial || !deceasedAt ? .6 : 1 }}>
                {savingMemorial ? t.memorial.saving : t.memorial.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upsell modal */}
      {showUpsellModal && (
        <div onClick={() => setShowUpsellModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .75rem" }}>
              {t.dashboard.upsell_title}
            </h2>
            <p style={{ fontSize: ".875rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.65, margin: "0 0 1.75rem" }}>
              {t.dashboard.upsell_desc.replace("{name}", pet?.name ?? "")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <Link href="/dashboard/upgrade" style={{ display: "block", padding: ".75rem 1.5rem", borderRadius: 100, background: "#C8813A", color: "#FDFAF5", textDecoration: "none", fontSize: ".875rem", fontWeight: 500 }}>
                {t.dashboard.upsell_cta}
              </Link>
              <button onClick={() => setShowUpsellModal(false)} style={{ padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer" }}>
                {t.dashboard.upsell_later}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", cursor: "pointer" }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      )}

      <div style={{ padding: "1rem 1.5rem .5rem", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`https://everypaw.app/pets/${id}`);
            alert(t.pet.link_copied);
          }}
          style={{ fontSize: ".75rem", color: "#7A5C44", background: "none", border: "1px solid rgba(61,43,31,.15)", borderRadius: 100, padding: ".375rem .875rem", cursor: "pointer", fontFamily: "inherit", minHeight: 36 }}
        >
          {t.nav.share_profile}
        </button>
      </div>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Pet header */}
        <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)", display: "flex", gap: "1.25rem", alignItems: "center", position: "relative" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }}>
            {SPECIES_EMOJI[pet.species]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .25rem" }}>{pet.name}</h1>
              {pet.deceased_at && (
                <span style={{ fontSize: ".7rem", background: "rgba(139,107,74,.12)", color: "#8B6B4A", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".2rem .6rem", fontWeight: 500, letterSpacing: ".04em" }}>
                  🕊️ {t.memorial.badge}
                </span>
              )}
            </div>
            <p style={{ fontSize: ".85rem", color: "#7A5C44", fontWeight: 300, margin: 0 }}>
              {pet.breed || pet.species}{pet.birthdate ? ` · ${t.pet.born} ${new Date(pet.birthdate).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}` : ""}
            </p>
            {pet.bio && <p style={{ fontSize: ".85rem", color: "#7A5C44", marginTop: ".5rem", fontStyle: "italic" }}>{pet.bio}</p>}
            {pet.deceased_at && (
              <div style={{ display: "flex", gap: ".75rem", marginTop: ".75rem", flexWrap: "wrap" }}>
                <Link href={`/memorial/${id}`} style={{ fontSize: ".75rem", color: "#8B6B4A", textDecoration: "none", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".2rem .75rem" }}>
                  {t.memorial.view_memorial}
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/memorial/${id}`);
                    alert(t.pet.link_copied);
                  }}
                  style={{ fontSize: ".75rem", color: "#8B6B4A", background: "none", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".2rem .75rem", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {t.memorial.share_memorial}
                </button>
              </div>
            )}
          </div>

          {/* Right column: kebab + milestone badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".625rem", flexShrink: 0 }}>

          {/* Kebab menu */}
          <div ref={kebabRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setShowKebabMenu(v => !v); setShowDeleteConfirm(false); }}
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(61,43,31,.12)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#7A5C44", fontFamily: "inherit" }}
              aria-label="Options"
            >
              ···
            </button>

            {showKebabMenu && (
              <div style={{ position: "absolute", top: "calc(100% + .5rem)", right: 0, background: "#FDFAF5", border: "1px solid rgba(61,43,31,.1)", borderRadius: 14, boxShadow: "0 8px 30px rgba(61,43,31,.12)", minWidth: 200, overflow: "hidden", zIndex: 60 }}>
                {!showDeleteConfirm ? (
                  <>
                    <Link
                      href={`/dashboard/pets/${id}/edit`}
                      style={{ display: "block", padding: ".75rem 1rem", fontSize: ".875rem", color: "#3D2B1F", textDecoration: "none", fontFamily: "inherit" }}
                      onClick={() => setShowKebabMenu(false)}
                    >
                      {t.pet.edit_profile}
                    </Link>
                    {!pet.deceased_at && (
                      <button
                        onClick={() => { setShowKebabMenu(false); setShowMemorialModal(true); }}
                        style={{ display: "block", width: "100%", padding: ".75rem 1rem", fontSize: ".875rem", color: "#8B6B4A", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {t.memorial.mark_passed}
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{ display: "block", width: "100%", padding: ".75rem 1rem", fontSize: ".875rem", color: "#A32D2D", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      {t.pet.delete_pet}
                    </button>
                  </>
                ) : (
                  <div style={{ padding: "1rem" }}>
                    <p style={{ fontSize: ".8rem", color: "#3D2B1F", margin: "0 0 .875rem", lineHeight: 1.5 }}>
                      {t.pet.delete_confirm.replace("{name}", pet.name)}
                    </p>
                    <div style={{ display: "flex", gap: ".5rem" }}>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{ flex: 1, padding: ".5rem", borderRadius: 100, border: "1px solid rgba(61,43,31,.15)", background: "transparent", fontSize: ".8rem", color: "#7A5C44", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {t.pet.delete_cancel}
                      </button>
                      <button
                        onClick={deletePet}
                        disabled={deletingPet}
                        style={{ flex: 1, padding: ".5rem", borderRadius: 100, border: "none", background: "#A32D2D", color: "#fff", fontSize: ".8rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: deletingPet ? .6 : 1 }}
                      >
                        {t.pet.delete_yes}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {milestones.length > 0 && (
            <div style={{ background: "rgba(200,129,58,.1)", borderRadius: 12, padding: ".5rem .875rem", textAlign: "center" }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#C8813A" }}>{milestones.length}</div>
              <div style={{ fontSize: ".7rem", color: "#7A5C44" }}>{t.milestones.label}</div>
            </div>
          )}

          </div>{/* end right column */}
        </div>

        {tab === "journal" && (
          <>
            {/* Mood filter pills */}
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
              <button
                onClick={() => setMoodFilter(null)}
                style={{
                  padding: ".35rem .75rem", borderRadius: 100, fontSize: ".78rem", fontWeight: moodFilter === null ? 500 : 400,
                  border: "1.5px solid", cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                  background: moodFilter === null ? "#C8813A" : "transparent",
                  color: moodFilter === null ? "#FDFAF5" : "#7A5C44",
                  borderColor: moodFilter === null ? "#C8813A" : "rgba(61,43,31,.2)",
                }}
              >
                {isFR ? "Tous" : "All"}
              </button>
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMoodFilter(moodFilter === m.value ? null : m.value)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: ".3rem",
                    padding: ".35rem .75rem", borderRadius: 100, fontSize: ".78rem", fontWeight: moodFilter === m.value ? 500 : 400,
                    border: "1.5px solid", cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                    background: moodFilter === m.value ? "rgba(200,129,58,.12)" : "transparent",
                    color: moodFilter === m.value ? "#C8813A" : "#7A5C44",
                    borderColor: moodFilter === m.value ? "#C8813A" : "rgba(61,43,31,.2)",
                  }}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.25rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
              <textarea
                value={newEntry}
                onChange={e => { setNewEntry(e.target.value); if (e.target.value.trim()) setEntryError(false); }}
                placeholder={t.journal.placeholder.replace("{name}", pet.name)}
                rows={3}
                style={{ width: "100%", border: entryError ? "1.5px solid #A32D2D" : "none", background: entryError ? "rgba(163,45,45,.04)" : "transparent", borderRadius: entryError ? 8 : 0, fontFamily: "inherit", fontSize: ".95rem", color: "#3D2B1F", outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box", padding: entryError ? ".5rem" : 0, transition: "border-color .15s" }}
              />
              {entryError && (
                <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: ".25rem 0 0", lineHeight: 1.4 }}>
                  {t.journal.entry_required}
                </p>
              )}
              {pendingPhotos.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: ".75rem 0" }}>
                  {pendingPhotos.map((photo, i) => (
                    <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                      <img src={photo.preview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />
                      <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#3D2B1F", color: "#FDFAF5", border: "none", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: ".75rem", flexWrap: "wrap", gap: ".5rem" }}>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: ".35rem" }}>
                    {MOOD_OPTIONS.map(m => (
                      <button key={m.value} onClick={() => setMood(m.value)} title={m.label} style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${mood === m.value ? "#C8813A" : "transparent"}`, background: mood === m.value ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                  {pendingPhotos.length < 5 && (
                    <button onClick={() => fileInputRef.current?.click()} style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", cursor: "pointer", fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A5C44" }} title="Add photos">
                      📷
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: "none" }} />
                </div>
                <button onClick={addEntry} disabled={saving || (!newEntry.trim() && pendingPhotos.length === 0)} style={{ padding: ".5rem 1.25rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500, cursor: "pointer", opacity: saving || (!newEntry.trim() && pendingPhotos.length === 0) ? .5 : 1 }}>
                  {uploadingPhotos ? t.journal.uploading : saving ? t.journal.saving : t.journal.add_moment}
                </button>
              </div>
            </div>

            <button onClick={generateStory} disabled={generating || entries.length < 3} style={{ width: "100%", padding: ".875rem", borderRadius: 16, border: "1.5px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.05)", color: "#C8813A", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: entries.length < 3 ? "not-allowed" : "pointer", marginBottom: "1.5rem", opacity: entries.length < 3 ? .5 : 1 }}>
              {generating ? t.journal.generating : t.journal.generate_story.replace("{name}", pet.name)}
              {entries.length < 3 && <span style={{ fontSize: ".75rem", display: "block", fontWeight: 300, marginTop: ".2rem" }}>{t.journal.add_more.replace("{count}", String(3 - entries.length)).replace("{entries}", 3 - entries.length === 1 ? t.journal.entry : t.journal.entries)}</span>}
            </button>

            {filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#7A5C44", fontSize: ".9rem" }}>
                {moodFilter ? (isFR ? "Aucune entrée pour ce filtre." : "No entries match this filter.") : t.journal.no_entries}
              </div>
            ) : groupedEntries.map(group => (
              <div key={group.month} style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: ".9rem", fontWeight: 600, color: "#7A5C44" }}>{group.month}</span>
                  <div style={{ flex: 1, height: "0.5px", background: "rgba(61,43,31,.1)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  {group.entries.map(entry => (
                    <div key={entry.id} style={{ background: "#FDFAF5", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(61,43,31,.06)" }}>
                      {entry.photo_urls && entry.photo_urls.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: entry.photo_urls.length === 1 ? "1fr" : entry.photo_urls.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: "2px" }}>
                          {entry.photo_urls.slice(0, 3).map((url: string, i: number) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img src={url} alt="" onClick={() => setLightboxUrl(url)}
                                style={{ width: "100%", height: entry.photo_urls.length === 1 ? 280 : 160, objectFit: "cover", display: "block", cursor: "pointer" }} />
                              {i === 2 && entry.photo_urls.length > 3 && (
                                <div onClick={() => setLightboxUrl(entry.photo_urls[2])} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                  <span style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 500 }}>+{entry.photo_urls.length - 3}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ padding: ".875rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: entry.content.trim() ? ".5rem" : 0 }}>
                          <span style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300 }}>
                            {new Date(entry.entry_date).toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                          {entry.mood && <span style={{ fontSize: ".9rem" }}>{MOOD_OPTIONS.find(m => m.value === entry.mood)?.emoji}</span>}
                        </div>
                        {entry.content.trim() && <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.65, margin: 0 }}>{entry.content}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "stories" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pet.deceased_at ? (
              <Link href={`/dashboard/pets/${id}/order?memorial=true`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", width: "100%", padding: ".875rem", borderRadius: 16, border: "1px solid rgba(139,107,74,.3)", background: "rgba(139,107,74,.08)", color: "#8B6B4A", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, marginBottom: ".5rem", textAlign: "center", textDecoration: "none", boxSizing: "border-box" as const }}>
                {t.memorial.order_book}
              </Link>
            ) : (
              <>
                <button onClick={handlePreviewPDF} disabled={previewLoading} style={{ width: "100%", padding: ".875rem", borderRadius: 16, border: "1.5px solid rgba(200,129,58,.3)", background: "rgba(200,129,58,.05)", color: "#C8813A", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", marginBottom: ".5rem", opacity: previewLoading ? .7 : 1 }}>
                  {previewLoading ? t.stories.generating_preview : t.stories.preview_book}
                </button>
                <Link
                  href={`/dashboard/pets/${id}/order`}
                  style={{
                    display: "block", width: "100%", padding: ".875rem", borderRadius: 16,
                    border: isPremium ? "1.5px solid rgba(200,129,58,.35)" : "none",
                    background: isPremium ? "rgba(200,129,58,.08)" : "#3D2B1F",
                    color: isPremium ? "#C8813A" : "#FDFAF5",
                    fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500,
                    marginBottom: "1.5rem", textAlign: "center", textDecoration: "none",
                    boxSizing: "border-box" as const,
                  }}
                >
                  {isPremium ? t.stories.order_book_premium : t.stories.order_book}
                </Link>
              </>
            )}
            {stories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✨</div>
                <p style={{ color: "#7A5C44", fontFamily: "Georgia, serif", fontSize: "1rem" }}>{t.stories.no_stories.replace("{name}", pet.name)}</p>
              </div>
            ) : stories.map(story => (
              <div key={story.id} style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>{story.title || `${pet.name}'s Story`}</h3>
                  <span style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300 }}>{new Date(story.created_at).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.75, marginBottom: "1.25rem", fontFamily: "Georgia, serif", fontStyle: "italic" }}>{story.content}</p>
                <div style={{ borderTop: "1px solid rgba(61,43,31,.06)", paddingTop: "1rem" }}>
                  <button
                    onClick={() => handleShare(story)}
                    disabled={sharingStoryId === story.id}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: ".5rem",
                      background: "transparent",
                      border: "1.5px solid rgba(200,129,58,.35)",
                      color: "#C8813A",
                      borderRadius: 100, padding: ".5rem 1.125rem",
                      fontSize: ".8rem", fontWeight: 500, cursor: "pointer",
                      fontFamily: "inherit", opacity: sharingStoryId === story.id ? .65 : 1,
                      transition: "background .15s, opacity .15s", minHeight: 36,
                    }}
                    onMouseEnter={e => { if (sharingStoryId !== story.id) (e.currentTarget as HTMLElement).style.background = "rgba(200,129,58,.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {sharingStoryId === story.id ? (
                      <>
                        <span style={{ fontSize: ".9rem" }}>⏳</span>
                        {t.stories.share_generating}
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        {t.stories.share_chapter}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "milestones" && (
          <div>
            {milestones.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🏆</div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "#3D2B1F", marginBottom: ".5rem" }}>{t.milestones.no_milestones_title}</h3>
                <p style={{ color: "#7A5C44", fontSize: ".875rem", fontWeight: 300, lineHeight: 1.6 }}>
                  {t.milestones.no_milestones_desc}<br />
                  {t.milestones.no_milestones_hint}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                {milestones.map(milestone => (
                  <div key={milestone.id} style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.25rem", border: "1px solid rgba(61,43,31,.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
                      🏆
                    </div>
                    <div>
                      <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .2rem" }}>{milestone.title}</p>
                      <p style={{ fontSize: ".75rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>
                        {new Date(milestone.achieved_at).toLocaleDateString(dateLocale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
