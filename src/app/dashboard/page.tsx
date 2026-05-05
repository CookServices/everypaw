"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry } from "@/types";
import Link from "next/link";

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: petsData } = await supabase.from("pets").select("*").order("created_at", { ascending: false });
      const { data: entriesData } = await supabase.from("entries").select("*").order("entry_date", { ascending: false }).limit(5);
      setPets(petsData || []);
      setEntries(entriesData || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "#7A5C44" }}>Loading your stories…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
        <button onClick={handleLogout} style={{ fontSize: ".8rem", color: "#7A5C44", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "2.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .25rem" }}>Your pets</h1>
            <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300 }}>Every moment, every story.</p>
          </div>
          <Link href="/dashboard/pets/new" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".625rem 1.25rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
            + Add a pet
          </Link>
        </div>

        {pets.length === 0 ? (
          <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "3rem 2rem", textAlign: "center", border: "1.5px dashed rgba(61,43,31,.15)", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "3rem", margin
