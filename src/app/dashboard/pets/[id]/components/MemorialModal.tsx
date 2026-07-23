"use client";

import { Entry } from "@/types";
import { Translations } from "./types";

export default function MemorialModal({
  t, isFR, petName, entries,
  deceasedAt, setDeceasedAt, memorialMessage, setMemorialMessage,
  memorialPhotoUrl, setMemorialPhotoUrl, setMemorialPhotoFile,
  memorialPhotoPreview, setMemorialPhotoPreview,
  showMemorialPhotoGrid, setShowMemorialPhotoGrid,
  memorialPhotoInputRef, savingMemorial, onSave, onClose,
}: {
  t: Translations;
  isFR: boolean;
  petName: string;
  entries: Entry[];
  deceasedAt: string;
  setDeceasedAt: React.Dispatch<React.SetStateAction<string>>;
  memorialMessage: string;
  setMemorialMessage: React.Dispatch<React.SetStateAction<string>>;
  memorialPhotoUrl: string | null;
  setMemorialPhotoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setMemorialPhotoFile: React.Dispatch<React.SetStateAction<File | null>>;
  memorialPhotoPreview: string | null;
  setMemorialPhotoPreview: React.Dispatch<React.SetStateAction<string | null>>;
  showMemorialPhotoGrid: boolean;
  setShowMemorialPhotoGrid: React.Dispatch<React.SetStateAction<boolean>>;
  memorialPhotoInputRef: React.RefObject<HTMLInputElement>;
  savingMemorial: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const entryPhotos = Array.from(new Set(entries.flatMap(e => e.photo_urls ?? []).filter(Boolean)));
  const displaySrc = memorialPhotoPreview ?? memorialPhotoUrl;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(28,20,16,.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--ep-bg-card)", borderRadius: 24, padding: "2rem", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🕊️</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .4rem" }}>{t.memorial.modal_title.replace("{name}", petName)}</h2>
          <p style={{ fontSize: ".8rem", color: "var(--ep-text-muted)", fontWeight: 300, margin: 0 }}>{t.memorial.modal_subtitle}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: ".75rem", fontWeight: 500, color: "var(--ep-text-muted)", display: "block", marginBottom: ".4rem" }}>{t.memorial.date_label}</label>
            <input type="date" value={deceasedAt} onChange={e => setDeceasedAt(e.target.value)} style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "var(--ep-bg)", fontFamily: "inherit", fontSize: ".9rem", color: "var(--ep-text)", outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div>
            <label style={{ fontSize: ".75rem", fontWeight: 500, color: "var(--ep-text-muted)", display: "block", marginBottom: ".4rem" }}>{t.memorial.message_label}</label>
            <textarea value={memorialMessage} onChange={e => setMemorialMessage(e.target.value)} placeholder={t.memorial.message_placeholder} rows={3} style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "var(--ep-bg)", fontFamily: "inherit", fontSize: ".9rem", color: "var(--ep-text)", outline: "none", resize: "none", boxSizing: "border-box" as const, lineHeight: 1.6 }} />
          </div>

          {/* Photo du mémorial */}
          <div>
            <label style={{ fontSize: ".75rem", fontWeight: 500, color: "var(--ep-text-muted)", display: "block", marginBottom: ".75rem" }}>
              {isFR ? "Photo du mémorial (optionnel)" : "Memorial photo (optional)"}
            </label>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: showMemorialPhotoGrid ? ".75rem" : 0 }}>
              {/* Preview */}
              <div style={{ width: 76, height: 76, borderRadius: 14, overflow: "hidden", background: "rgba(61,43,31,.07)", border: "1.5px solid rgba(61,43,31,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {displaySrc
                  ? <img src={displaySrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: "1.75rem" }}>🕊️</span>}
              </div>
              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                <button
                  type="button"
                  onClick={() => memorialPhotoInputRef.current?.click()}
                  style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".375rem .75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".78rem", color: "var(--ep-text-muted)", cursor: "pointer" }}
                >
                  {isFR ? "Uploader une photo" : "Upload a photo"}
                </button>
                {entryPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMemorialPhotoGrid(v => !v)}
                    style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".375rem .75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".78rem", color: "var(--ep-text-muted)", cursor: "pointer" }}
                  >
                    {isFR ? "Choisir dans le journal" : "Pick from journal"} {showMemorialPhotoGrid ? "▲" : "▼"}
                  </button>
                )}
                {displaySrc && (
                  <button
                    type="button"
                    onClick={() => {
                      setMemorialPhotoUrl(null);
                      setMemorialPhotoFile(null);
                      if (memorialPhotoPreview) URL.revokeObjectURL(memorialPhotoPreview);
                      setMemorialPhotoPreview(null);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", padding: ".375rem .5rem", borderRadius: 100, border: "none", background: "transparent", fontFamily: "inherit", fontSize: ".72rem", color: "var(--ep-text-faint)", cursor: "pointer" }}
                  >
                    × {isFR ? "Retirer" : "Remove"}
                  </button>
                )}
              </div>
            </div>

            {/* Grid de photos du journal */}
            {showMemorialPhotoGrid && entryPhotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, maxHeight: 168, overflowY: "auto", borderRadius: 10, padding: 2 }}>
                {entryPhotos.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setMemorialPhotoUrl(url);
                      setMemorialPhotoFile(null);
                      if (memorialPhotoPreview) URL.revokeObjectURL(memorialPhotoPreview);
                      setMemorialPhotoPreview(null);
                      setShowMemorialPhotoGrid(false);
                    }}
                    style={{ position: "relative", cursor: "pointer", borderRadius: 6, overflow: "hidden", border: `2px solid ${memorialPhotoUrl === url ? "var(--ep-brand)" : "transparent"}`, aspectRatio: "1 / 1" }}
                  >
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                ))}
              </div>
            )}

            <input
              ref={memorialPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (memorialPhotoPreview) URL.revokeObjectURL(memorialPhotoPreview);
                setMemorialPhotoFile(file);
                setMemorialPhotoPreview(URL.createObjectURL(file));
                setMemorialPhotoUrl(null);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: ".75rem", marginTop: "1.5rem" }}>
          <button onClick={onClose} style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".875rem", color: "var(--ep-text-muted)", cursor: "pointer" }}>
            {t.memorial.cancel}
          </button>
          <button onClick={onSave} disabled={savingMemorial || !deceasedAt} style={{ flex: 2, padding: ".75rem", borderRadius: 100, border: "none", background: "var(--ep-memorial)", color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: savingMemorial || !deceasedAt ? .6 : 1 }}>
            {savingMemorial ? t.memorial.saving : t.memorial.save}
          </button>
        </div>
      </div>
    </div>
  );
}
