interface Props {
  previewHtml: string;
  previewStale: boolean;
  previewLabel: string;
  closeLabel: string;
  onClose: () => void;
}

export default function PreviewModal({ previewHtml, previewStale, previewLabel, closeLabel, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.75)", backdropFilter: "blur(4px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 860, height: "90vh", display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}
      >
        {/* Modal header */}
        <div style={{ background: "var(--ep-text)", padding: ".75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", color: "#F7C27A", display: "flex", alignItems: "center", gap: ".5rem" }}>
            {previewLabel}
            {previewStale && <span style={{ fontSize: ".7rem", background: "rgba(200,129,58,.25)", color: "#F7C27A", padding: ".15rem .5rem", borderRadius: 4 }}>↻ mise à jour…</span>}
          </span>
          <button
            onClick={onClose}
            style={{ background: "rgba(247,242,234,.12)", border: "none", color: "var(--ep-bg)", borderRadius: 8, padding: ".35rem .75rem", cursor: "pointer", fontFamily: "inherit", fontSize: ".8rem" }}
          >
            {closeLabel} ✕
          </button>
        </div>
        {/* iframe via srcdoc, evite les restrictions blob: URL / CSP */}
        <iframe
          srcDoc={previewHtml}
          style={{ flex: 1, border: "none", background: "var(--ep-bg)" }}
          title="Book preview"
        />
      </div>
    </div>
  );
}
