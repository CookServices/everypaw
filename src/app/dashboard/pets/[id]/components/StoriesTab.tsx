"use client";

import Link from "next/link";
import { Entry, Story } from "@/types";
import { fmtDateOrdinal } from "@/lib/date";
import { STORY_STYLES } from "../constants";
import { Translations } from "./types";

export default function StoriesTab({
  t, isFR, dateLocale, petName, stories, entries, allEntryDates,
  showFirstStoryNudge, onOpenGenerateModal, generating, generatingMsgIdx,
  userPlan, sharingStoryId, onShare, onOpenShareCard,
  hasMoreEntries, filterYear, filterMonth, onLoadMore, loadingMore,
}: {
  t: Translations;
  isFR: boolean;
  dateLocale: string;
  petName: string;
  stories: Story[];
  entries: Entry[];
  allEntryDates: string[];
  showFirstStoryNudge: boolean;
  onOpenGenerateModal: () => void;
  generating: boolean;
  generatingMsgIdx: number;
  userPlan: string;
  sharingStoryId: string | null;
  onShare: (story: Story) => void;
  onOpenShareCard: (story: Story) => void;
  hasMoreEntries: boolean;
  filterYear: string | null;
  filterMonth: string | null;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  const generatingMessages = [
    t.journal.generating_1.replace("{name}", petName),
    t.journal.generating_2,
    t.journal.generating_3,
  ];

  const now = new Date();
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntil = Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / 864e5);
  const thisMonthPrefix = now.toISOString().slice(0, 7);
  const hasThisMonthStory = stories.some(s => s.created_at.slice(0, 7) === thisMonthPrefix);
  const nextDay = firstOfNextMonth.getDate();
  const nextMonthName = firstOfNextMonth.toLocaleDateString(dateLocale, { month: "long" });
  const ordinal = isFR
    ? (nextDay === 1 ? `1er` : `${nextDay}`)
    : (nextDay === 1 ? "1st" : nextDay === 2 ? "2nd" : nextDay === 3 ? "3rd" : `${nextDay}th`);
  const nextDate = isFR ? `${ordinal} ${nextMonthName}` : `${nextMonthName} ${ordinal}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* First-story nudge, disappears for good once a story exists for this pet */}
      {showFirstStoryNudge && (
        <div style={{ background: "rgba(200,129,58,.06)", borderRadius: 16, padding: "1.25rem 1.5rem", border: "1px solid rgba(200,129,58,.2)", display: "flex", flexDirection: "column", gap: ".5rem" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--ep-text)", margin: 0 }}>
            {t.first_story_nudge.card_title}
          </p>
          <p style={{ fontSize: ".85rem", color: "var(--ep-text-muted)", lineHeight: 1.6, margin: 0 }}>
            {t.first_story_nudge.card_subtitle.replace("{count}", String(allEntryDates.length))}
          </p>
          <button
            onClick={onOpenGenerateModal}
            style={{ alignSelf: "flex-start", marginTop: ".25rem", padding: ".625rem 1.25rem", borderRadius: 100, border: "none", background: "var(--ep-brand)", color: "#fff", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500, cursor: "pointer" }}
          >
            {t.first_story_nudge.card_cta}
          </button>
        </div>
      )}

      {/* Next chapter indicator */}
      <div style={{ background: hasThisMonthStory ? "rgba(61,43,31,.04)" : "rgba(200,129,58,.06)", borderRadius: 12, padding: ".625rem 1rem", border: `1px solid ${hasThisMonthStory ? "rgba(61,43,31,.08)" : "rgba(200,129,58,.2)"}`, display: "flex", flexDirection: "column", gap: ".35rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: ".8rem", color: hasThisMonthStory ? "var(--ep-text-muted)" : "var(--ep-brand)", fontWeight: hasThisMonthStory ? 300 : 500 }}>
            {hasThisMonthStory
              ? (isFR ? `✓ Chapitre de ${now.toLocaleDateString(dateLocale, { month: "long" })} généré` : `✓ ${now.toLocaleDateString(dateLocale, { month: "long" })} chapter generated`)
              : (isFR ? `✨ Générez le chapitre de ${now.toLocaleDateString(dateLocale, { month: "long" })}` : `✨ Generate ${now.toLocaleDateString(dateLocale, { month: "long" })}'s chapter`)}
          </span>
          <span style={{ fontSize: ".72rem", color: "var(--ep-text-faint)", fontWeight: 300, flexShrink: 0 }}>
            {isFR ? `Prochain : ${nextDate} (dans ${daysUntil}j)` : `Next: ${nextDate} (in ${daysUntil}d)`}
          </span>
        </div>
        <span style={{ fontSize: ".72rem", color: "var(--ep-text-faint)", fontWeight: 300 }}>
          {isFR ? "Généré automatiquement" : "Auto-generated"}
        </span>
      </div>

      {/* Generate button, mirrors journal tab CTA */}
      <button
        onClick={() => { if (entries.length >= 3) onOpenGenerateModal(); }}
        disabled={generating || entries.length < 3}
        style={{ width: "100%", padding: ".875rem", borderRadius: 16, border: "1.5px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.05)", color: "var(--ep-brand)", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: entries.length < 3 ? "not-allowed" : "pointer", opacity: entries.length < 3 ? .5 : 1 }}
      >
        {generating ? generatingMessages[generatingMsgIdx] : t.journal.generate_story.replace("{name}", petName)}
        {entries.length < 3 && <span style={{ fontSize: ".75rem", display: "block", fontWeight: 300, marginTop: ".2rem" }}>{t.journal.add_more.replace("{count}", String(3 - entries.length)).replace("{entries}", 3 - entries.length === 1 ? t.journal.entry : t.journal.entries)}</span>}
      </button>

      {stories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✨</div>
          <p style={{ color: "var(--ep-text-muted)", fontFamily: "Georgia, serif", fontSize: "1rem" }}>{t.stories.no_stories.replace("{name}", petName)}</p>
        </div>
      ) : stories.map(story => (
        <div key={story.id}>
        <div style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", gap: ".75rem" }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--ep-text)", margin: 0 }}>{story.title || `${petName}'s Story`}</h3>
            <span style={{ fontSize: ".72rem", color: "var(--ep-text-faint)", fontWeight: 300, flexShrink: 0 }}>{fmtDateOrdinal(new Date(story.created_at), isFR, { month: "short", year: "numeric" })}</span>
          </div>
          {(story.period_start && story.period_end || story.style) && (
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: ".875rem", alignItems: "center" }}>
              {story.period_start && story.period_end && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", background: "rgba(200,129,58,.07)", borderRadius: 100, padding: ".25rem .75rem", fontSize: ".72rem", color: "var(--ep-brand)", fontWeight: 500 }}>
                  {fmtDateOrdinal(new Date(story.period_start + "T12:00:00"), isFR, { month: "short" })} – {fmtDateOrdinal(new Date(story.period_end + "T12:00:00"), isFR, { month: "short", year: "numeric" })}
                </span>
              )}
              {story.style && (() => {
                const s = STORY_STYLES.find(st => st.value === story.style);
                return s ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", background: "rgba(61,43,31,.05)", borderRadius: 100, padding: ".25rem .75rem", fontSize: ".72rem", color: "var(--ep-text-muted)", fontWeight: 400 }}>
                    <span>{s.icon}</span>
                    <span>{isFR ? s.labelFR : s.labelEN}</span>
                  </span>
                ) : null;
              })()}
            </div>
          )}
          <div style={{ fontSize: "1.05rem", color: "var(--ep-text)", lineHeight: 1.8, marginBottom: "1.25rem", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            {story.content
              .replace(/\*\*(INTRO|INTRODUCTION|DÉVELOPPEMENT|DEVELOPPEMENT|DEVELOPMENT|CHUTE|CONCLUSION|ENDING)\*\*/gi, "")
              .split(/\n{2,}/)
              .map((para, i) => para.trim())
              .filter(para => para.length > 0)
              .map((para, i) => <p key={i} style={{ margin: i === 0 ? "0 0 1rem" : "0 0 1rem" }}>{para}</p>)
            }
          </div>
          <div style={{ borderTop: "1px solid rgba(61,43,31,.06)", paddingTop: "1rem", display: "flex", gap: ".625rem", flexWrap: "wrap" }}>
            <button
              onClick={() => onShare(story)}
              disabled={sharingStoryId === story.id}
              style={{
                display: "inline-flex", alignItems: "center", gap: ".5rem",
                background: "transparent",
                border: "1.5px solid rgba(200,129,58,.35)",
                color: "var(--ep-brand)",
                borderRadius: 100, padding: ".5rem 1.125rem",
                fontSize: ".8rem", fontWeight: 500, cursor: "pointer",
                fontFamily: "inherit", opacity: sharingStoryId === story.id ? .65 : 1,
                transition: "background .15s, opacity .15s", minHeight: 36,
              }}
              onMouseEnter={e => { if (sharingStoryId !== story.id) (e.currentTarget as HTMLElement).style.background = "rgba(200,129,58,.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {sharingStoryId === story.id ? (
                <>
                  <span style={{ fontSize: ".9rem" }}>⏳</span>
                  {t.stories.share_generating}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  {t.stories.share_chapter}
                </>
              )}
            </button>
            <button
              onClick={() => onOpenShareCard(story)}
              style={{
                display: "inline-flex", alignItems: "center", gap: ".5rem",
                background: "transparent",
                border: "1.5px solid rgba(61,43,31,.18)",
                color: "var(--ep-text-muted)",
                borderRadius: 100, padding: ".5rem 1.125rem",
                fontSize: ".8rem", fontWeight: 500, cursor: "pointer",
                fontFamily: "inherit",
                transition: "background .15s", minHeight: 36,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              {t.stories.share_card_open}
            </button>
          </div>
        </div>
        {userPlan === "free" && (
          <div style={{ background: "#FFF3E0", borderRadius: 12, padding: "20px", border: "1px solid rgba(200,129,58,.2)" }}>
            <p style={{ fontSize: ".875rem", color: "var(--ep-text)", lineHeight: 1.6, margin: "0 0 1rem", fontFamily: "Georgia, serif" }}>
              {t.stories.free_upsell_text}
            </p>
            <Link
              href="/dashboard/settings"
              style={{ display: "inline-block", padding: ".625rem 1.25rem", borderRadius: 100, background: "var(--ep-brand)", color: "var(--ep-bg-card)", fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}
            >
              {t.stories.free_upsell_cta}
            </Link>
            <p style={{ fontSize: ".75rem", color: "var(--ep-text-faint)", margin: ".75rem 0 0", fontWeight: 300 }}>
              {t.stories.free_upsell_refresh}
            </p>
          </div>
        )}
        </div>
      ))}

      {hasMoreEntries && !filterYear && !filterMonth && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".5rem 1.25rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", color: "var(--ep-text-muted)", fontSize: ".8rem", fontFamily: "inherit", cursor: loadingMore ? "wait" : "pointer", opacity: loadingMore ? .6 : 1 }}
          >
            {loadingMore ? (isFR ? "Chargement…" : "Loading…") : (isFR ? "Charger plus" : "Load more")}
          </button>
        </div>
      )}
    </div>
  );
}
