"use client";

import { TributeRow } from "./types";

export default function TributesTab({
  isFR, dateLocale, tributesLoaded, pendingTributes, setPendingTributes,
}: {
  isFR: boolean;
  dateLocale: string;
  tributesLoaded: boolean;
  pendingTributes: TributeRow[];
  setPendingTributes: React.Dispatch<React.SetStateAction<TributeRow[]>>;
}) {
  return (
    <div>
      <div style={{ background: "rgba(200,129,58,.06)", borderRadius: 14, padding: ".875rem 1rem", marginBottom: "1.25rem", border: "1px solid rgba(200,129,58,.2)", display: "flex", gap: ".625rem", alignItems: "flex-start" }}>
        <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: ".05rem" }}>🕊️</span>
        <p style={{ fontSize: ".8rem", color: "var(--ep-text-muted)", margin: 0, lineHeight: 1.55 }}>
          {isFR
            ? "Les hommages soumis par les proches apparaissent ici avant publication. Approuvez ceux que vous souhaitez afficher sur la page mémorial."
            : "Tributes submitted by family and friends appear here before publishing. Approve the ones you want to display on the memorial page."}
        </p>
      </div>

      {!tributesLoaded ? (
        <p style={{ fontSize: ".85rem", color: "var(--ep-text-faint)", fontStyle: "italic" }}>{isFR ? "Chargement…" : "Loading…"}</p>
      ) : pendingTributes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--ep-text-faint)", fontSize: ".9rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🕊️</div>
          <p style={{ margin: 0, fontStyle: "italic" }}>
            {isFR ? "Aucun hommage en attente de validation." : "No tributes pending review."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {pendingTributes.map(tribute => (
            <div key={tribute.id} style={{ background: "var(--ep-bg-card)", borderRadius: 16, padding: "1.125rem 1.25rem", border: "1px solid rgba(61,43,31,.08)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: ".5rem" }}>
                <span style={{ fontSize: ".9rem", fontWeight: 600, color: "var(--ep-text)" }}>{tribute.author_name}</span>
                <span style={{ fontSize: ".72rem", color: "var(--ep-text-faint)" }}>
                  {new Date(tribute.created_at).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <p style={{ fontSize: ".875rem", color: "var(--ep-text-muted)", lineHeight: 1.65, margin: "0 0 1rem", fontStyle: "italic" }}>
                {tribute.message}
              </p>
              <div style={{ display: "flex", gap: ".625rem" }}>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/memorial/tributes/${tribute.id}/approve`, { method: "POST" });
                    if (res.ok) setPendingTributes(prev => prev.filter(t => t.id !== tribute.id));
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".5rem 1rem", borderRadius: 100, background: "var(--ep-brand)", color: "var(--ep-bg-card)", border: "none", cursor: "pointer", fontSize: ".8rem", fontWeight: 500, fontFamily: "inherit" }}
                >
                  ✓ {isFR ? "Approuver" : "Approve"}
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/memorial/tributes/${tribute.id}/reject`, { method: "POST" });
                    if (res.ok) setPendingTributes(prev => prev.filter(t => t.id !== tribute.id));
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".5rem 1rem", borderRadius: 100, background: "transparent", color: "var(--ep-text-faint)", border: "1.5px solid rgba(61,43,31,.12)", cursor: "pointer", fontSize: ".8rem", fontFamily: "inherit" }}
                >
                  {isFR ? "Rejeter" : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
