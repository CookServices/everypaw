"use client";

import { ALL_EMOJIS, EMOJI_CATEGORIES } from "../constants";

type PendingPhoto = { file: File; preview: string };

export default function EditEntryModal({
  isFR, editContent, setEditContent, editMood, setEditMood,
  showEditEmojiPicker, setShowEditEmojiPicker, editEmojiPickerRef,
  editPhotos, setEditPhotos, editPendingPhotos, setEditPendingPhotos, editFileInputRef,
  savingEdit, onSave, onClose,
}: {
  isFR: boolean;
  editContent: string;
  setEditContent: React.Dispatch<React.SetStateAction<string>>;
  editMood: string | null;
  setEditMood: React.Dispatch<React.SetStateAction<string | null>>;
  showEditEmojiPicker: boolean;
  setShowEditEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  editEmojiPickerRef: React.RefObject<HTMLDivElement>;
  editPhotos: string[];
  setEditPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  editPendingPhotos: PendingPhoto[];
  setEditPendingPhotos: React.Dispatch<React.SetStateAction<PendingPhoto[]>>;
  editFileInputRef: React.RefObject<HTMLInputElement>;
  savingEdit: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "1.75rem", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(61,43,31,.18)", maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 1rem" }}>
          {isFR ? "Modifier ce moment" : "Edit this moment"}
        </h3>
        <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} maxLength={1000}
          style={{ width: "100%", boxSizing: "border-box", padding: ".75rem", borderRadius: 10, border: "1.5px solid rgba(61,43,31,.15)", background: "var(--ep-bg)", fontFamily: "inherit", fontSize: ".9rem", color: "var(--ep-text)", resize: "none", outline: "none", lineHeight: 1.6 }} />

        {/* Emoji / mood */}
        <div style={{ margin: ".75rem 0 1rem" }}>
          <div ref={editEmojiPickerRef} style={{ position: "relative", display: "inline-block" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <button onClick={() => setShowEditEmojiPicker(v => !v)}
                style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${editMood ? "var(--ep-brand)" : "rgba(61,43,31,.2)"}`, background: editMood ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset" }}
                title={isFR ? "Ajouter une émoticône" : "Add an emoji"}>
                {editMood ? (ALL_EMOJIS.find(e => e.value === editMood)?.emoji ?? "😊") : "😊"}
              </button>
              {editMood && (
                <button onClick={e => { e.stopPropagation(); setEditMood(null); }}
                  style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: "rgba(61,43,31,.25)", color: "var(--ep-text)", border: "none", cursor: "pointer", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, fontWeight: 700, minHeight: "unset" }}>
                  ✕
                </button>
              )}
            </div>
            {showEditEmojiPicker && (
              <div style={{ position: "absolute", top: "calc(100% + .5rem)", left: 0, background: "var(--ep-bg-card)", border: "1px solid rgba(61,43,31,.1)", borderRadius: 16, boxShadow: "0 8px 30px rgba(61,43,31,.15)", padding: "1rem", zIndex: 60, width: 280, maxHeight: 300, overflowY: "auto" }}>
                {EMOJI_CATEGORIES.map(cat => (
                  <div key={cat.label} style={{ marginBottom: ".75rem" }}>
                    <p style={{ fontSize: ".65rem", fontWeight: 600, color: "var(--ep-text-faint)", margin: "0 0 .4rem" }}>{cat.label}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: ".2rem" }}>
                      {cat.emojis.map(e => (
                        <button key={e.value} onClick={() => { setEditMood(editMood === e.value ? null : e.value); setShowEditEmojiPicker(false); }}
                          title={e.label}
                          style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${editMood === e.value ? "var(--ep-brand)" : "transparent"}`, background: editMood === e.value ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {e.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Existing photos */}
        {editPhotos.length > 0 && (
          <div style={{ marginBottom: ".75rem" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 500, color: "var(--ep-text-muted)", margin: "0 0 .5rem" }}>{isFR ? "Photos existantes" : "Existing photos"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {editPhotos.map((url, i) => (
                <div key={i} style={{ position: "relative", width: 64, height: 64 }}>
                  <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                  <button onClick={() => setEditPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--ep-alert)", color: "#fff", border: "none", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset", padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New pending photos */}
        {editPendingPhotos.length > 0 && (
          <div style={{ marginBottom: ".75rem" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 500, color: "var(--ep-text-muted)", margin: "0 0 .5rem" }}>{isFR ? "Nouvelles photos" : "New photos"}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {editPendingPhotos.map((p, i) => (
                <div key={i} style={{ position: "relative", width: 64, height: 64 }}>
                  <img src={p.preview} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                  <button onClick={() => setEditPendingPhotos(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); })} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "var(--ep-text)", color: "#fff", border: "none", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add photo button */}
        {editPhotos.length + editPendingPhotos.length < 5 && (
          <button
            onClick={() => editFileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: ".4rem", padding: ".4rem .875rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "var(--ep-text-muted)", fontFamily: "inherit", fontSize: ".8rem", cursor: "pointer", marginBottom: ".75rem" }}
          >
            <span>{isFR ? "Ajouter une photo" : "Add a photo"}</span>
          </button>
        )}
        <input
          ref={editFileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => {
            const files = Array.from(e.target.files || []);
            const remaining = 5 - editPhotos.length - editPendingPhotos.length;
            const newPhotos = files.slice(0, remaining).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
            setEditPendingPhotos(prev => [...prev, ...newPhotos]);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />

        <div style={{ display: "flex", gap: ".625rem", marginTop: ".5rem" }}>
          <button onClick={onClose} style={{ flex: 1, padding: ".6rem 1rem", borderRadius: 100, border: "1px solid rgba(61,43,31,.15)", background: "transparent", color: "var(--ep-text-muted)", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
            {isFR ? "Annuler" : "Cancel"}
          </button>
          <button onClick={onSave} disabled={savingEdit} style={{ flex: 2, padding: ".6rem 1rem", borderRadius: 100, border: "none", background: "var(--ep-brand)", color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: savingEdit ? .7 : 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
            {savingEdit ? (isFR ? "Enregistrement…" : "Saving…") : (isFR ? "Enregistrer" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
