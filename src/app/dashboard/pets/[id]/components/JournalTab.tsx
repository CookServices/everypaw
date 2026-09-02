"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Entry, Pet, Story } from "@/types";
import { fmtDateOrdinal } from "@/lib/date";
import { MOOD_OPTIONS, EMOJI_CATEGORIES, ALL_EMOJIS } from "../constants";
import { groupEntriesByMonth } from "../utils";
import { MAX_ENTRY_PHOTOS, type EntryComposer } from "../useEntryComposer";
import { Translations } from "./types";

export default function JournalTab({
  t, isFR, locale, dateLocale, pet, entries, allEntryDates, stories, userPlan,
  currentUserId, memberProfiles,
  composer, saving, uploadingPhotos, onAddEntry,
  generating, generatingMsgIdx, onOpenGenerateModal,
  filterYear, setFilterYear, filterMonth, setFilterMonth,
  deletingEntryId, setDeletingEntryId, onEditEntry, onOpenLightbox,
}: {
  t: Translations;
  isFR: boolean;
  locale: string;
  dateLocale: string;
  pet: Pet;
  entries: Entry[];
  allEntryDates: string[];
  stories: Story[];
  userPlan: string;
  currentUserId: string | null;
  memberProfiles: Record<string, string>;
  composer: EntryComposer;
  saving: boolean;
  uploadingPhotos: boolean;
  onAddEntry: () => void;
  generating: boolean;
  generatingMsgIdx: number;
  onOpenGenerateModal: () => void;
  filterYear: string | null;
  setFilterYear: (year: string | null) => void;
  filterMonth: string | null;
  setFilterMonth: (month: string | null) => void;
  deletingEntryId: string | null;
  setDeletingEntryId: (id: string | null) => void;
  onEditEntry: (entry: Entry) => void;
  onOpenLightbox: (url: string) => void;
}) {
  // The per-entry "···" menu is only ever open inside this tab, so it lives here
  // rather than in the page.
  const [entryMenuId, setEntryMenuId] = useState<string | null>(null);
  const entryMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (entryMenuRef.current && !entryMenuRef.current.contains(e.target as Node)) {
        setEntryMenuId(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const availableYears = Array.from(new Set(allEntryDates.map(d => d.slice(0, 4)))).sort().reverse();
  const MONTHS = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: new Date(2000, i, 1).toLocaleDateString(dateLocale, { month: "long" }).replace(/^./, s => s.toUpperCase()),
  }));
  const filteredEntries = entries.filter(e => {
    if (filterYear && e.entry_date.slice(0, 4) !== filterYear) return false;
    if (filterMonth && e.entry_date.slice(5, 7) !== filterMonth) return false;
    return true;
  });
  const groupedEntries = groupEntriesByMonth(filteredEntries, locale);

  // Mo17, monthly progress pill
  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);
  const thisMonthCount = entries.filter(e => e.entry_date?.slice(0, 7) === monthPrefix).length;
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntil = Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / 864e5);
  const hasThisMonthStory = stories.some(s => s.created_at?.slice(0, 7) === monthPrefix);
  let progressLabel: string;
  if (hasThisMonthStory) {
    progressLabel = t.journal.month_progress_done.replace("{count}", String(thisMonthCount));
  } else if (daysUntil <= 0) {
    progressLabel = t.journal.month_progress_soon.replace("{count}", String(thisMonthCount));
  } else if (daysUntil === 1) {
    progressLabel = t.journal.month_progress_tomorrow.replace("{count}", String(thisMonthCount));
  } else {
    progressLabel = t.journal.month_progress_days.replace("{count}", String(thisMonthCount)).replace("{days}", String(daysUntil));
  }

  const generatingMessages = [
    t.journal.generating_1.replace("{name}", pet.name),
    t.journal.generating_2,
    t.journal.generating_3,
  ];

  return (
    <>
      <div style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: hasThisMonthStory ? "rgba(107,123,94,.1)" : "rgba(200,129,58,.08)", borderRadius: 100, padding: ".3rem .75rem", marginBottom: "1rem", border: `1px solid ${hasThisMonthStory ? "rgba(107,123,94,.25)" : "rgba(200,129,58,.2)"}` }}>
        <span style={{ fontSize: ".75rem", color: hasThisMonthStory ? "#6B7B5E" : "var(--ep-brand)", fontWeight: 500 }}>
          {progressLabel}
        </span>
      </div>

      {/* Date filter dropdowns */}
      {availableYears.length >= 1 && (
        <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.25rem" }}>
          <select
            value={filterYear ?? ""}
            onChange={e => { setFilterYear(e.target.value || null); setFilterMonth(null); }}
            style={{ flex: "0 0 auto", height: 36, padding: "0 .625rem", borderRadius: 8, border: "1.5px solid #D4C5B0", background: "var(--ep-bg)", color: "var(--ep-text)", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", outline: "none" }}
          >
            <option value="">{isFR ? "Toutes les années" : "All years"}</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterMonth ?? ""}
            onChange={e => setFilterMonth(e.target.value || null)}
            style={{ flex: "0 0 auto", height: 36, padding: "0 .625rem", borderRadius: 8, border: "1.5px solid #D4C5B0", background: "var(--ep-bg)", color: "var(--ep-text)", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", outline: "none" }}
          >
            <option value="">{isFR ? "Tous les mois" : "All months"}</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      )}

      {userPlan === "free" && allEntryDates.length >= 5 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem", background: allEntryDates.length >= 9 ? "var(--ep-brand)" : "#FFF3E0", border: `1px solid ${allEntryDates.length >= 9 ? "var(--ep-brand)" : "#F7C27A"}`, borderRadius: 8, padding: "8px 12px", marginBottom: "1rem" }}>
          <span style={{ fontSize: "13px", color: allEntryDates.length >= 9 ? "#fff" : "var(--ep-text-muted)", fontWeight: 400 }}>
            {t.journal.entry_counter.replace("{count}", String(allEntryDates.length))}
          </span>
          <Link href="/dashboard/settings" style={{ fontSize: "13px", color: allEntryDates.length >= 9 ? "#fff" : "var(--ep-brand)", fontWeight: 500, textDecoration: "none" }}>
            {t.journal.upgrade_unlimited}
          </Link>
        </div>
      )}

      <div style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "1.25rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
        <textarea
          value={composer.text}
          onChange={e => { composer.setText(e.target.value); if (e.target.value.trim()) composer.setError(false); }}
          onFocus={() => composer.setTextareaFocused(true)}
          onBlur={() => composer.setTextareaFocused(false)}
          placeholder={t.journal.placeholder.replace("{name}", pet.name)}
          rows={3}
          maxLength={1000}
          style={{ width: "100%", border: composer.error ? "1.5px solid var(--ep-alert)" : "none", background: composer.error ? "rgba(163,45,45,.04)" : "transparent", borderRadius: composer.error ? 8 : 0, fontFamily: "inherit", fontSize: ".95rem", color: "var(--ep-text)", outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box", padding: composer.error ? ".5rem" : 0, transition: "border-color .15s" }}
        />
        {composer.error && (
          <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", margin: ".25rem 0 0", lineHeight: 1.4 }}>
            {t.journal.entry_required}
          </p>
        )}
        {(composer.textareaFocused || composer.text.length > 0) && (
          <p style={{ fontSize: ".72rem", textAlign: "right", margin: ".2rem 0 0", color: composer.text.length > 950 ? "var(--ep-alert)" : composer.text.length > 800 ? "var(--ep-brand)" : "var(--ep-text-faint)" }}>
            {composer.text.length} / 1000
          </p>
        )}
        {composer.photos.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: ".75rem 0" }}>
            {composer.photos.map((photo, i) => (
              <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                <img src={photo.preview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />
                <button onClick={() => composer.removePhoto(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--ep-text)", color: "var(--ep-bg-card)", border: "none", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset", padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: ".75rem", flexWrap: "wrap", gap: ".5rem" }}>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
            <div ref={composer.emojiPickerRef} style={{ position: "relative" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <button onClick={() => composer.setEmojiPickerOpen(v => !v)}
                  style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${composer.mood ? "var(--ep-brand)" : "rgba(61,43,31,.2)"}`, background: composer.mood ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset" }}
                  title={isFR ? "Ajouter une émoticône" : "Add an emoji"}>
                  {composer.mood ? (ALL_EMOJIS.find(e => e.value === composer.mood)?.emoji ?? "😊") : "😊"}
                </button>
                {composer.mood && (
                  <button onClick={e => { e.stopPropagation(); composer.setMood(null); }}
                    style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: "rgba(61,43,31,.25)", color: "var(--ep-text)", border: "none", cursor: "pointer", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, fontWeight: 700, minHeight: "unset" }}>
                    ✕
                  </button>
                )}
              </div>
              {composer.emojiPickerOpen && (
                <div style={{ position: "absolute", top: "calc(100% + .5rem)", left: 0, background: "var(--ep-bg-card)", border: "1px solid rgba(61,43,31,.1)", borderRadius: 16, boxShadow: "0 8px 30px rgba(61,43,31,.15)", padding: "1rem", zIndex: 60, width: 280, maxHeight: 340, overflowY: "auto" }}>
                  {EMOJI_CATEGORIES.map(cat => (
                    <div key={cat.label} style={{ marginBottom: ".75rem" }}>
                      <p style={{ fontSize: ".65rem", fontWeight: 600, color: "var(--ep-text-faint)", margin: "0 0 .4rem" }}>{cat.label}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: ".2rem" }}>
                        {cat.emojis.map(e => (
                          <button key={e.value} onClick={() => { composer.setMood(composer.mood === e.value ? null : e.value); composer.setEmojiPickerOpen(false); }}
                            title={e.label}
                            style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${composer.mood === e.value ? "var(--ep-brand)" : "transparent"}`, background: composer.mood === e.value ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {e.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {composer.photos.length < MAX_ENTRY_PHOTOS && (
              <button onClick={() => composer.fileInputRef.current?.click()} style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", cursor: "pointer", fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ep-text-muted)" }} title="Add photos">
                📷
              </button>
            )}
            <input ref={composer.fileInputRef} type="file" accept="image/*" multiple onChange={composer.handlePhotoSelect} style={{ display: "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <input
              type="date"
              value={composer.date}
              min={pet?.birthdate ?? undefined}
              max={today}
              onChange={e => composer.setDate(e.target.value)}
              style={{ height: 32, padding: "0 .5rem", borderRadius: 8, border: `1.5px solid ${composer.date !== today ? "var(--ep-brand)" : "rgba(61,43,31,.2)"}`, background: composer.date !== today ? "rgba(200,129,58,.08)" : "transparent", fontFamily: "inherit", fontSize: ".78rem", color: "var(--ep-text)", outline: "none", cursor: "pointer" }}
            />
            <button onClick={onAddEntry} disabled={saving || composer.isEmpty} style={{ padding: ".5rem 1.25rem", borderRadius: 100, border: "none", background: "var(--ep-brand)", color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500, cursor: "pointer", opacity: saving || composer.isEmpty ? .5 : 1 }}>
              {uploadingPhotos ? t.journal.uploading : saving ? t.journal.saving : t.journal.add_moment}
            </button>
          </div>
        </div>
      </div>

      <button onClick={() => { if (entries.length >= 3) onOpenGenerateModal(); }} disabled={generating || entries.length < 3} style={{ width: "100%", padding: ".875rem", borderRadius: 16, border: "1.5px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.05)", color: "var(--ep-brand)", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: entries.length < 3 ? "not-allowed" : "pointer", marginBottom: "1.5rem", opacity: entries.length < 3 ? .5 : 1 }}>
        {generating ? generatingMessages[generatingMsgIdx] : t.journal.generate_story.replace("{name}", pet.name)}
        {entries.length < 3 && <span style={{ fontSize: ".75rem", display: "block", fontWeight: 300, marginTop: ".2rem" }}>{t.journal.add_more.replace("{count}", String(3 - entries.length)).replace("{entries}", 3 - entries.length === 1 ? t.journal.entry : t.journal.entries)}</span>}
      </button>

      {filteredEntries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--ep-text-muted)", fontSize: ".9rem" }}>
          <img src="/illustrations/paw.svg" alt="" aria-hidden style={{ width: 52, display: "block", margin: "0 auto 1rem", opacity: .9 }} />
          {(filterYear || filterMonth) ? (isFR ? "Aucune entrée pour cette période." : "No entries for this period.") : t.journal.no_entries}
        </div>
      ) : groupedEntries.map(group => (
        <div key={group.month} style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: ".9rem", fontWeight: 600, color: "var(--ep-text-muted)" }}>{group.month}</span>
            <div style={{ flex: 1, height: "0.5px", background: "rgba(61,43,31,.1)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {group.entries.map(entry => (
              <div key={entry.id} style={{ background: "var(--ep-bg-card)", borderRadius: 16, border: "1px solid rgba(61,43,31,.06)" }}>
                <div style={{ padding: ".875rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: entry.content.trim() ? ".5rem" : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".75rem", color: "var(--ep-text-muted)", fontWeight: 300 }}>
                        {fmtDateOrdinal(new Date(entry.entry_date), isFR, { weekday: "short", month: "short" })}
                      </span>
                      {entry.mood && <span style={{ fontSize: ".9rem" }}>{ALL_EMOJIS.find(m => m.value === entry.mood)?.emoji ?? MOOD_OPTIONS.find(m => m.value === entry.mood)?.emoji}</span>}
                      {currentUserId && entry.user_id !== currentUserId && (
                        <span style={{ fontSize: ".7rem", color: "var(--ep-text-faint)", background: "rgba(61,43,31,.06)", borderRadius: 100, padding: "1px 7px" }}>
                          {t.members.added_by.replace("{name}", memberProfiles[entry.user_id] ?? (isFR ? "Membre" : "Member"))}
                        </span>
                      )}
                    </div>
                    <div ref={entryMenuId === entry.id ? entryMenuRef : null} style={{ position: "relative" }}>
                      <button onClick={() => setEntryMenuId(entryMenuId === entry.id ? null : entry.id)}
                        style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(61,43,31,.12)", background: "transparent", cursor: "pointer", fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ep-text-muted)", fontFamily: "inherit", lineHeight: 1, minHeight: "unset", flexShrink: 0 }}>···</button>
                      {entryMenuId === entry.id && !deletingEntryId && (
                        <div style={{ position: "absolute", top: "calc(100% + .3rem)", right: 0, background: "var(--ep-bg-card)", border: "1px solid rgba(61,43,31,.1)", borderRadius: 10, boxShadow: "0 4px 16px rgba(61,43,31,.12)", minWidth: 140, zIndex: 30 }}>
                          <button onClick={() => { onEditEntry(entry); setEntryMenuId(null); }}
                            style={{ display: "block", width: "100%", padding: ".625rem .875rem", fontSize: ".8rem", color: "var(--ep-text)", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                            {isFR ? "Modifier" : "Edit"}
                          </button>
                          <button onClick={() => { setDeletingEntryId(entry.id); setEntryMenuId(null); }}
                            style={{ display: "block", width: "100%", padding: ".625rem .875rem", fontSize: ".8rem", color: "var(--ep-alert)", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                            {isFR ? "Supprimer" : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {entry.content.trim() && <p style={{ fontSize: ".9rem", color: "var(--ep-text)", lineHeight: 1.65, margin: 0 }}>{entry.content}</p>}
                </div>
                {entry.photo_urls && entry.photo_urls.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: entry.photo_urls.length === 1 ? "1fr" : entry.photo_urls.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: "2px", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
                    {entry.photo_urls.slice(0, 3).map((url: string, i: number) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img src={url} alt="" onClick={() => onOpenLightbox(url)}
                          style={{ width: "100%", height: entry.photo_urls.length === 1 ? 280 : 160, objectFit: "cover", display: "block", cursor: "pointer" }} />
                        {i === 2 && entry.photo_urls.length > 3 && (
                          <div onClick={() => onOpenLightbox(entry.photo_urls[2])} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <span style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 500 }}>+{entry.photo_urls.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
