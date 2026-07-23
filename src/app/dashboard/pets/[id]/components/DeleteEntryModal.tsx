"use client";

export default function DeleteEntryModal({ isFR, onCancel, onConfirm }: { isFR: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "1.75rem", maxWidth: 360, width: "100%", boxShadow: "0 8px 40px rgba(61,43,31,.18)" }}>
        <p style={{ fontSize: ".9rem", color: "var(--ep-text)", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
          {isFR ? "Voulez-vous vraiment supprimer ce moment ?" : "Are you sure you want to delete this moment?"}
        </p>
        <div style={{ display: "flex", gap: ".625rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: ".6rem 1rem", borderRadius: 100, border: "1px solid rgba(61,43,31,.15)", background: "transparent", color: "var(--ep-text-muted)", fontFamily: "inherit", fontSize: ".85rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
            {isFR ? "Annuler" : "Cancel"}
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: ".6rem 1rem", borderRadius: 100, border: "none", background: "var(--ep-alert)", color: "#fff", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
            {isFR ? "Supprimer" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
