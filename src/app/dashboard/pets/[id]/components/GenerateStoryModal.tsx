"use client";

import { Entry } from "@/types";
import { STORY_STYLES } from "../constants";

export default function GenerateStoryModal({
  isFR, entries, storyStyle, setStoryStyle,
  genPeriodStart, setGenPeriodStart, genPeriodEnd, setGenPeriodEnd,
  onGenerate, onClose,
}: {
  isFR: boolean;
  entries: Entry[];
  storyStyle: string | null;
  setStoryStyle: React.Dispatch<React.SetStateAction<string | null>>;
  genPeriodStart: string;
  setGenPeriodStart: React.Dispatch<React.SetStateAction<string>>;
  genPeriodEnd: string;
  setGenPeriodEnd: React.Dispatch<React.SetStateAction<string>>;
  onGenerate: () => void;
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--ep-bg-card)", borderRadius: 24, padding: "2rem", maxWidth: 480, width: "100%", boxShadow: "0 16px 60px rgba(61,43,31,.2)", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 1.5rem" }}>
          {isFR ? "Créer une histoire" : "Create a story"}
        </h2>

        {/* Style selector */}
        <p style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--ep-text-muted)", margin: "0 0 .75rem" }}>
          {isFR ? "Style narratif" : "Narrative style"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginBottom: "1.5rem" }}>
          {STORY_STYLES.map(s => (
            <button key={s.value} onClick={() => setStoryStyle(storyStyle === s.value ? null : s.value)}
              style={{ display: "flex", alignItems: "center", gap: ".875rem", padding: ".75rem 1rem", borderRadius: 12, border: `1.5px solid ${storyStyle === s.value ? "var(--ep-brand)" : "rgba(61,43,31,.12)"}`, background: storyStyle === s.value ? "rgba(200,129,58,.08)" : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .12s" }}>
              <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: ".875rem", fontWeight: 600, color: storyStyle === s.value ? "var(--ep-brand)" : "var(--ep-text)", margin: "0 0 .15rem" }}>{isFR ? s.labelFR : s.labelEN}</p>
                <p style={{ fontSize: ".75rem", color: "var(--ep-text-muted)", margin: 0, fontWeight: 300 }}>{isFR ? s.descFR : s.descEN}</p>
              </div>
              {storyStyle === s.value && <span style={{ marginLeft: "auto", fontSize: ".85rem", color: "var(--ep-brand)", flexShrink: 0 }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <p style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--ep-text-muted)", margin: "0 0 .75rem" }}>
          {isFR ? "Période (optionnel)" : "Period (optional)"}
        </p>
        {(() => {
          const firstEntry = entries.length > 0 ? entries[entries.length - 1].entry_date : undefined;
          const lastEntry = entries.length > 0 ? entries[0].entry_date : undefined;
          const today = new Date().toISOString().split("T")[0];
          const maxDate = lastEntry && lastEntry < today ? lastEntry : today;
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".625rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ fontSize: ".72rem", color: "var(--ep-text-muted)", display: "block", marginBottom: ".3rem" }}>{isFR ? "Du" : "From"}</label>
                <input type="date" value={genPeriodStart} min={firstEntry} max={maxDate}
                  onChange={e => setGenPeriodStart(e.target.value)}
                  style={{ width: "100%", padding: ".625rem .875rem", borderRadius: 10, border: "1.5px solid rgba(61,43,31,.15)", background: "var(--ep-bg)", fontFamily: "inherit", fontSize: ".85rem", color: "var(--ep-text)", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize: ".72rem", color: "var(--ep-text-muted)", display: "block", marginBottom: ".3rem" }}>{isFR ? "Au" : "To"}</label>
                <input type="date" value={genPeriodEnd} min={firstEntry} max={maxDate}
                  onChange={e => setGenPeriodEnd(e.target.value)}
                  style={{ width: "100%", padding: ".625rem .875rem", borderRadius: 10, border: "1.5px solid rgba(61,43,31,.15)", background: "var(--ep-bg)", fontFamily: "inherit", fontSize: ".85rem", color: "var(--ep-text)", outline: "none", boxSizing: "border-box" as const }} />
              </div>
            </div>
          );
        })()}
        <p style={{ fontSize: ".75rem", color: "var(--ep-text-faint)", margin: "-.5rem 0 1.5rem", lineHeight: 1.5 }}>
          {isFR ? "Sans période : toutes les entrées sont utilisées." : "Without a period: all entries are used."}
        </p>

        <div style={{ display: "flex", gap: ".75rem" }}>
          <button onClick={onClose} style={{ flex: 1, padding: ".75rem 1rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "var(--ep-text-muted)", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44 }}>
            {isFR ? "Annuler" : "Cancel"}
          </button>
          <button onClick={onGenerate} style={{ flex: 2, padding: ".75rem 1rem", borderRadius: 100, border: "none", background: "var(--ep-brand)", color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44 }}>
            {isFR ? "Générer ✨" : "Generate ✨"}
          </button>
        </div>
      </div>
    </div>
  );
}
