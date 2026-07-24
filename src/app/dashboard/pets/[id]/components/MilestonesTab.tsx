"use client";

import { MILESTONE_TYPES, MilestoneDefinition } from "@/lib/milestones";
import { fmtDateOrdinal } from "@/lib/date";
import { Translations, MilestoneRow } from "./types";

export default function MilestonesTab({
  t, isFR, milestones, totalMilestoneCount, milestoneDefinitions,
}: {
  t: Translations;
  isFR: boolean;
  milestones: MilestoneRow[];
  totalMilestoneCount: number;
  milestoneDefinitions: MilestoneDefinition[];
}) {
  // Build full list with achieved flag, then sort:
  // 1. achieved first, 2. alphabetical within each group
  const definedItems = (milestoneDefinitions.length
    ? milestoneDefinitions.map(def => ({ key: def.key, icon: def.icon ?? "🏆", localTitle: isFR ? def.name_fr : def.name_en, keywords: def.keywords ?? [] }))
    : MILESTONE_TYPES.map(mt => ({ key: mt.type, icon: mt.icon, localTitle: isFR ? mt.titleFR : mt.title, keywords: mt.keywords }))
  ).map(item => ({ ...item, achieved: milestones.find(m => m.type === item.key) ?? null }));

  // Orphan milestones: recorded in DB but not present in milestone_definitions
  // (e.g. "in_memory" set when marking a pet as deceased, or legacy "first_entry")
  const definedKeys = new Set(definedItems.map(i => i.key));
  const orphanItems = milestones
    .filter(m => !definedKeys.has(m.type))
    .map(m => {
      const fallback = MILESTONE_TYPES.find(mt => mt.type === m.type);
      return {
        key: m.type,
        icon: fallback?.icon ?? "🏆",
        localTitle: fallback ? (isFR ? fallback.titleFR : fallback.title) : (m.title ?? m.type),
        keywords: fallback?.keywords ?? [],
        achieved: m,
      };
    });

  const allItems = [...definedItems, ...orphanItems].sort((a, b) => {
    if (!!a.achieved !== !!b.achieved) return a.achieved ? -1 : 1;
    return a.localTitle.localeCompare(b.localTitle, isFR ? "fr" : "en", { sensitivity: "base" });
  });

  const achievedItems = allItems.filter(i => i.achieved);
  const pendingItems = allItems.filter(i => !i.achieved);

  const renderItem = ({ key, icon, localTitle, achieved, keywords }: typeof allItems[number]) => {
    const lockHint = !achieved && keywords.length > 0
      ? t.milestones.unlock_hint.replace("{keyword}", isFR ? (keywords[1] ?? keywords[0]) : keywords[0])
      : null;
    return (
      <div key={key} style={{ background: "var(--ep-bg-card)", borderRadius: 14, padding: ".875rem 1.125rem", border: `1px solid ${achieved ? "rgba(200,129,58,.2)" : "rgba(61,43,31,.06)"}`, display: "flex", alignItems: "center", gap: ".875rem", opacity: achieved ? 1 : 0.6 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: achieved ? "rgba(200,129,58,.12)" : "rgba(61,43,31,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", flexShrink: 0 }}>
          {achieved ? icon : "🔒"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: ".875rem", fontWeight: 500, color: achieved ? "var(--ep-text)" : "var(--ep-text-muted)", margin: "0 0 .15rem" }}>{localTitle}</p>
          <p style={{ fontSize: ".72rem", color: achieved ? "var(--ep-text-muted)" : "var(--ep-text-faint)", margin: 0, fontWeight: 300 }}>
            {achieved
              ? fmtDateOrdinal(new Date(achieved.achieved_at), isFR, { month: "long", year: "numeric" })
              : (lockHint ?? t.milestones.not_yet)}
          </p>
        </div>
        {achieved && <span style={{ fontSize: ".9rem", flexShrink: 0 }}>✅</span>}
      </div>
    );
  };

  return (
    <div>
      {/* Auto-detection info box */}
      <div style={{ background: "rgba(200,129,58,.06)", borderRadius: 14, padding: ".875rem 1rem", marginBottom: "1.25rem", border: "1px solid rgba(200,129,58,.2)", display: "flex", gap: ".625rem", alignItems: "flex-start" }}>
        <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: ".05rem" }}>💡</span>
        <p style={{ fontSize: ".8rem", color: "var(--ep-text-muted)", margin: 0, lineHeight: 1.55 }}>
          {t.milestones.auto_hint}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--ep-bg-card)", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: "1.25rem", border: "1px solid rgba(61,43,31,.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".625rem" }}>
          <span style={{ fontSize: ".85rem", fontWeight: 500, color: "var(--ep-text)" }}>
            {milestones.length} / {totalMilestoneCount} {t.milestones.steps_completed}
          </span>
          <span style={{ fontSize: ".8rem", color: "var(--ep-brand)", fontWeight: 600 }}>
            {Math.round(milestones.length / (totalMilestoneCount) * 100)}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 100, background: "rgba(61,43,31,.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 100, background: "var(--ep-brand)", width: "100%", transform: `scaleX(${totalMilestoneCount ? milestones.length / totalMilestoneCount : 0})`, transformOrigin: "left", transition: "transform .5s ease" }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
        {achievedItems.length > 0 && (
          <>
            <p style={{ fontSize: ".68rem", fontWeight: 600, color: "var(--ep-brand)", margin: "0 0 .1rem", fontFamily: "sans-serif" }}>
              {t.milestones.unlocked.replace("{n}", String(achievedItems.length))}
            </p>
            {achievedItems.map(renderItem)}
          </>
        )}
        {pendingItems.length > 0 && (
          <>
            <p style={{ fontSize: ".68rem", fontWeight: 600, color: "var(--ep-text-faint)", margin: `${achievedItems.length > 0 ? ".5rem" : "0"} 0 .1rem`, fontFamily: "sans-serif" }}>
              {t.milestones.locked.replace("{n}", String(pendingItems.length))}
            </p>
            {pendingItems.map(renderItem)}
          </>
        )}
      </div>
    </div>
  );
}
