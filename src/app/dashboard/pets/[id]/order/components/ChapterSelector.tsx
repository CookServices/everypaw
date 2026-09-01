import type { Dispatch, SetStateAction } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Story, LayoutType } from "../constants";
import { PAGE_LAYOUTS } from "../constants";

type Translations = ReturnType<typeof getTranslations>;

interface Props {
  visibleStories: Story[];
  labelColor: string;
  chaptersLabel: string;
  selectedStoryIds: string[];
  setSelectedStoryIds: Dispatch<SetStateAction<string[]>>;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
  isMemorial: boolean;
  t: Translations;
  locale: Locale;
  textMuted: string;
  textPrimary: string;
  petName: string;
  storyLayouts: Record<string, LayoutType>;
  setStoryLayouts: Dispatch<SetStateAction<Record<string, LayoutType>>>;
}

export default function ChapterSelector({
  visibleStories,
  labelColor,
  chaptersLabel,
  selectedStoryIds,
  setSelectedStoryIds,
  cardBg,
  cardBorder,
  accentColor,
  isMemorial,
  t,
  locale,
  textMuted,
  textPrimary,
  petName,
  storyLayouts,
  setStoryLayouts,
}: Props) {
  if (visibleStories.length === 0) return null;

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".875rem", fontFamily: "sans-serif" }}>
        {chaptersLabel}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        {visibleStories.map((story, i) => {
          const isSelected = selectedStoryIds.includes(story.id);
          return (
            <div
              key={story.id}
              onClick={() => {
                setSelectedStoryIds(prev =>
                  isSelected
                    ? prev.filter(sid => sid !== story.id)
                    : [...prev, story.id]
                );
              }}
              style={{
                background: cardBg,
                border: isSelected
                  ? `1.5px solid ${accentColor}`
                  : cardBorder,
                borderRadius: 16, padding: "1.25rem 1.5rem",
                cursor: "pointer",
                display: "flex", alignItems: "flex-start", gap: "1rem",
                transition: "border-color .15s",
              }}
            >
              {/* Checkbox indicator */}
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                background: isSelected ? accentColor : "transparent",
                border: `2px solid ${isSelected ? accentColor : isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--ep-bg-card)", fontSize: ".7rem", fontWeight: 700,
              }}>
                {isSelected ? "✓" : ""}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: ".6rem", marginBottom: ".4rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: ".7rem", fontWeight: 600, color: accentColor }}>
                    {t.order.preview_chapter} {i + 1}
                  </span>
                  {(() => {
                    const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
                    const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale, { month: "short", year: "numeric" });
                    // Fallback sur created_at si period_start est absent
                    const start = fmt(story.period_start ?? story.created_at);
                    const end = story.period_end ? fmt(story.period_end) : null;
                    const label = end && end !== start ? `${start} – ${end}` : start;
                    return (
                      <span style={{ fontSize: ".68rem", color: textMuted, fontFamily: "sans-serif" }}>
                        {label}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem", lineHeight: 1.3 }}>
                  {story.title || `${petName}'s Story`}
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: ".84rem", color: textMuted, lineHeight: 1.75, marginBottom: ".875rem" }}>
                  {story.content.slice(0, 160).trim()}
                  {story.content.length > 160 ? "…" : ""}
                </div>
                {/* Layout selector, stop click propagation so it doesn't toggle selection */}
                <div
                  onClick={e => e.stopPropagation()}
                  style={{ borderTop: `1px solid ${isMemorial ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.06)"}`, paddingTop: ".75rem" }}
                >
                  <div style={{ fontSize: ".65rem", color: textMuted, fontFamily: "sans-serif", marginBottom: ".4rem" }}>
                    {t.order.layout_label}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".35rem" }}>
                    {PAGE_LAYOUTS.map(layout => {
                      const isActive = (storyLayouts[story.id] ?? "classic") === layout.id;
                      return (
                        <button
                          key={layout.id}
                          onClick={() => setStoryLayouts(prev => ({ ...prev, [story.id]: layout.id }))}
                          style={{
                            padding: ".4rem .5rem",
                            borderRadius: 8,
                            border: `1.5px solid ${isActive ? accentColor : isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`,
                            background: isActive ? `${accentColor}18` : "transparent",
                            color: isActive ? accentColor : textMuted,
                            cursor: "pointer",
                            fontSize: ".68rem",
                            fontFamily: "sans-serif",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: ".3rem",
                            transition: "all .12s",
                            whiteSpace: "nowrap",
                            minHeight: "unset",
                          }}
                        >
                          <span style={{ fontSize: ".9rem", lineHeight: 1, flexShrink: 0 }}>{layout.icon}</span>
                          <span>{t.order[layout.labelKey]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
