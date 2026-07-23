"use client";

import { Story } from "@/types";
import { Translations } from "./types";

export default function ShareCardModal({
  t, story, format, setFormat, error, setError, loading, blob, onDownload, onClose,
}: {
  t: Translations;
  story: Story;
  format: "square" | "story";
  setFormat: React.Dispatch<React.SetStateAction<"square" | "story">>;
  error: boolean;
  setError: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  blob: Blob | null;
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--ep-bg-card)", borderRadius: 24, padding: "1.75rem", maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.22)" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 1.25rem", textAlign: "center" }}>
          {t.stories.share_card_modal_title}
        </h2>
        {/* Format picker */}
        <div style={{ display: "flex", gap: ".625rem", marginBottom: "1.25rem" }}>
          {(["square", "story"] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              style={{
                flex: 1, padding: ".625rem .5rem",
                borderRadius: 12,
                border: `1.5px solid ${format === fmt ? "var(--ep-brand)" : "rgba(61,43,31,.15)"}`,
                background: format === fmt ? "rgba(200,129,58,.08)" : "transparent",
                color: format === fmt ? "var(--ep-brand)" : "var(--ep-text-muted)",
                fontSize: ".78rem", fontWeight: format === fmt ? 600 : 400,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all .15s",
              }}
            >
              {fmt === "square" ? t.stories.share_card_format_square : t.stories.share_card_format_story}
            </button>
          ))}
        </div>
        {/* Preview thumbnail */}
        <div style={{
          background: "#FAF6F0",
          borderRadius: 14,
          marginBottom: "1.25rem",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          aspectRatio: format === "story" ? "9/16" : "1/1",
          border: "1px solid rgba(61,43,31,.08)",
          maxHeight: 240,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/share-card?story_id=${story.id}&format=${format}`}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setError(true)}
          />
        </div>
        {error && (
          <p style={{ fontSize: ".78rem", color: "#C0392B", textAlign: "center", margin: "0 0 1rem" }}>
            {t.stories.share_error}
          </p>
        )}
        {/* Actions */}
        <div style={{ display: "flex", gap: ".625rem" }}>
          <button
            onClick={onDownload}
            disabled={loading || !blob}
            style={{
              flex: 1, padding: ".75rem", borderRadius: 100,
              background: "var(--ep-brand)", color: "var(--ep-bg-card)",
              border: "none", fontSize: ".875rem", fontWeight: 500,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit", opacity: (loading || !blob) ? .65 : 1,
              transition: "opacity .15s",
            }}
          >
            {loading ? t.stories.share_generating : t.stories.share_card_share}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: ".75rem 1.25rem", borderRadius: 100,
              border: "1.5px solid rgba(61,43,31,.15)",
              background: "transparent", color: "var(--ep-text-muted)",
              fontSize: ".875rem", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {t.stories.share_card_close}
          </button>
        </div>
      </div>
    </div>
  );
}
