"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Species } from "@/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SPECIES: { value: Species; label: string; emoji: string }[] = [
  { value: "dog", label: "Dog", emoji: "🐶" },
  { value: "cat", label: "Cat", emoji: "🐱" },
  { value: "rabbit", label: "Rabbit", emoji: "🐰" },
  { value: "bird", label: "Bird", emoji: "🐦" },
  { value: "other", label: "Other", emoji: "🐾" },
];

export default function NewPetPage() {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleCreate = async () => {
    if (!name.trim()) { setError("Give your pet a name!"); return; }
    setStatus("loading");
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("pets").insert({
      user_id: user!.id, name: name.trim(), species,
      breed: breed || null, birthdate: birthdate || null, bio: bio || null,
    });
    if (err) { setError(err.message); setStatus("error"); }
    else window.location.href = "/dashboard";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/dashboard" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>← Back</Link>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F" }}>Add a pet</span>
      </nav>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", boxShadow: "0 4px 40px rgba(61,43,31,.06)" }}>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: ".8rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".75rem" }}>Species</label>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {SPECIES.map(s => (
                <button key={s.value} onClick={() => setSpecies(s.value)} style={{ padding: ".5rem 1rem", borderRadius: 100, border: `1.5px solid ${species === s.value ? "#C8813A" : "rgba(61,43,31,.15)"}`, background: species === s.value ? "rgba(200,129,58,.1)" : "transparent", color: species === s.value ? "#C8813A" : "#3D2B1F", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", display: "flex", alignItems: "center", gap: ".35rem" }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {[
            { label: "Name *", value: name, setter: setName, placeholder: "Luna, Biscuit, Mochi…", type: "text" },
            { label: "Breed", value: breed, setter: setBreed, placeholder: "Golden Retriever, Siamese…", type: "text" },
            { label: "Birthday", value: birthdate, setter: setBirthdate, placeholder: "", type: "date" },
          ].map(field => (
            <div key={field.label} style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: ".8rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".5rem" }}>{field.label}</label>
              <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder}
                style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: ".8rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".5rem" }}>A little about them</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="What makes them unique? Their personality, quirks, favourite things…" rows={3}
              style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {error && <p style={{ fontSize: ".8rem", color: "#A32D2D", marginBottom: "1rem" }}>{error}</p>}

          <button onClick={handleCreate} disabled={status === "loading"} style={{ width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: status === "loading" ? .7 : 1 }}>
            {status === "loading" ? "Creating…" : "Create profile →"}
          </button>
        </div>
      </main>
    </div>
  );
}
