"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const [emailReminders, setEmailReminders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("email_reminders")
        .single();
      if (data) setEmailReminders(data.email_reminders ?? true);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ email_reminders: emailReminders })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/dashboard" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>← Dashboard</Link>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F" }}>Settings</span>
      </nav>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1.5rem" }}>Email preferences</h2>

          {loading ? (
            <p style={{ color: "#7A5C44", fontSize: ".9rem" }}>Loading…</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0", borderBottom: "0.5px solid rgba(61,43,31,.08)" }}>
                <div>
                  <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .25rem" }}>Weekly reminders</p>
                  <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>Receive a weekly email to keep your pet's journal up to date.</p>
                </div>
                <button
                  onClick={() => setEmailReminders(!emailReminders)}
                  style={{
                    width: 44, height: 24, borderRadius: 100,
                    background: emailReminders ? "#C8813A" : "rgba(61,43,31,.15)",
                    border: "none", cursor: "pointer", position: "relative",
                    transition: "background .2s", flexShrink: 0, marginLeft: "1rem"
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2,
                    left: emailReminders ? 22 : 2,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "#FDFAF5", transition: "left .2s",
                    display: "block"
                  }} />
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{ marginTop: "1.5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: saved ? "#639922" : "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: saving ? .7 : 1, transition: "background .3s" }}
              >
                {saved ? "✓ Saved" : saving ? "Saving…" : "Save preferences"}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
