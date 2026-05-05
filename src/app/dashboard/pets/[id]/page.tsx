"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry, Story } from "@/types";
import Link from "next/link";
import { use } from "react";

const MOOD_OPTIONS = [
  { value: "happy", emoji: "😄", label: "Happy" },
  { value: "funny", emoji: "😂", label: "Funny" },
  { value: "tender", emoji: "🥰", label: "Tender" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "proud", emoji: "🏆", label: "Proud" },
];

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

export default function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pet, setPet] = useState<Pet | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [mood, setMood] = useState("happy");
  const [tab, setTab] = useState<"journal" | "stories">("journal");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const [{ data: petData }, { data: entriesData }, { data: storiesData }] = await Promise.all([
        supabase.from("pets").select("*").eq("id", id).single(),
        supabase.from("entries").select("*").eq("pet_id", id).order("entry_date", { ascending: false }),
        supabase.from("stories").select("*").eq("pet_id", id).order("created_at", { ascending: false }),
      ]);
      setPet(petData);
      setEntries(entriesData || []);
      setStories(storiesData || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const addEntry = async () => {
    if (!newEntry.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("entries").insert({
      pet_id: id, user_id: user!.id, content: newEntry.trim(), mood,
    }).select().single();
    if (data) setEntries([data, ...entries]);
    setNewEntry("");
    setSaving(false);
  };

  const generateStory = async () => {
    if (entries.length < 3) { alert("Add at least 3 journal entries before generating a story."); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: id, petName: pet?.name, species: pet?.species, bio: pet?.bio, entries: entries.slice(0, 20) }),
      });
      const data = await res.json();
      if (data.story) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: saved } = await supabase.from("stories").insert({
          pet_id: id, user_id: user!.id, content: data.story, title: data.title,
          period_start: entries[entries.length - 1]?.entry_date,
          period_end: entries[0]?.entry_date,
        }).select().single();
        if (saved) setStories([saved, ...stories]);
        setTab("stories");
      }
    } catch (e) { alert("Generation failed. Please try again."); }
    setGenerating(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#7A5C44" }}>
      Loading…
    </div>
  );

  if (!pet) return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      Pet not found.
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/dashboard" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>← Dashboard</Link>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "#3D2B1F" }}>
          {SPECIES_EMOJI[pet.species]} {pet.name}
        </span>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Pet header */}
        <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)", display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }}>
            {SPECIES_EMOJI[pet.species]}
          </div>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .25rem" }}>{pet.name}</h1>
            <p style={{ fontSize: ".85rem", color: "#7A5C44", fontWeight: 300, margin: 0 }}>
              {pet.breed || pet.species}{pet.birthdate ? ` · Born ${new Date(pet.birthdate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : ""}
            </p>
            {pet.bio && <p style={{ fontSize: ".85rem", color: "#7A5C44", marginTop: ".5rem", fontStyle: "italic" }}>{pet.bio}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem" }}>
          {(["journal", "stories"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: ".5rem 1.25rem", borderRadius: 100, border: `1.5px solid ${tab === t ? "#C8813A" : "rgba(61,43,31,.15)"}`, background: tab === t ? "rgba(200,129,58,.1)" : "transparent", color: tab === t ? "#C8813A" : "#7A5C44", fontFamily: "inherit", fontSize: ".875rem", fontWeight: tab === t ? 500 : 400, cursor: "pointer", textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>

        {tab === "journal" && (
          <>
            {/* New entry */}
            <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.25rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
              <textarea value={newEntry} onChange={e => setNewEntry(e.target.value)} placeholder={`What did ${pet.name} do today?`} rows={3}
                style={{ width: "100%", border: "none", background: "transparent", fontFamily: "inherit", fontSize: ".95rem", color: "#3D2B1F", outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: ".75rem", flexWrap: "wrap", gap: ".5rem" }}>
                <div style={{ display: "flex", gap: ".35rem" }}>
                  {MOOD_OPTIONS.map(m => (
                    <button key={m.value} onClick={() => setMood(m.value)} title={m.label} style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${mood === m.value ? "#C8813A" : "transparent"}`, background: mood === m.value ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {m.emoji}
                    </button>
                  ))}
                </div>
                <button onClick={addEntry} disabled={saving || !newEntry.trim()} style={{ padding: ".5rem 1.25rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500, cursor: "pointer", opacity: saving || !newEntry.trim() ? .5 : 1 }}>
                  {saving ? "Saving…" : "Add moment"}
                </button>
              </div>
            </div>

            {/* Generate button */}
            <button onClick={generateStory} disabled={generating || entries.length < 3} style={{ width: "100%", padding: ".875rem", borderRadius: 16, border: "1.5px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.05)", color: "#C8813A", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: entries.length < 3 ? "not-allowed" : "pointer", marginBottom: "1.5rem", opacity: entries.length < 3 ? .5 : 1 }}>
              {generating ? "✨ Generating story…" : `✨ Generate ${pet.name}'s story`}
              {entries.length < 3 && <span style={{ fontSize: ".75rem", display: "block", fontWeight: 300, marginTop: ".2rem" }}>Add {3 - entries.length} more {3 - entries.length === 1 ? "entry" : "entries"} to unlock</span>}
            </button>

            {/* Entries list */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {entries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#7A5C44", fontSize: ".9rem" }}>
                  No entries yet — write your first moment above ✨
                </div>
              ) : entries.map(entry => (
                <div key={entry.id} style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.25rem", border: "1px solid rgba(61,43,31,.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem" }}>
                    <span style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300 }}>
                      {new Date(entry.entry_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    {entry.mood && <span style={{ fontSize: ".9rem" }}>{MOOD_OPTIONS.find(m => m.value === entry.mood)?.emoji}</span>}
                  </div>
                  <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.65, margin: 0 }}>{entry.content}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "stories" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {stories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✨</div>
                <p style={{ color: "#7A5C44", fontFamily: "Georgia, serif", fontSize: "1rem" }}>
                  No stories yet — go to Journal and generate {pet.name}&apos;s first story.
                </p>
              </div>
            ) : stories.map(story => (
              <div key={story.id} style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>{story.title || `${pet.name}'s Story`}</h3>
                  <span style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300 }}>
                    {new Date(story.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.75, margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{story.content}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
