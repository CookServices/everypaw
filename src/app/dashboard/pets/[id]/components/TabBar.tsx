"use client";

import Link from "next/link";

export type TabKey = "journal" | "stories" | "milestones" | "tributes" | "members";

export default function TabBar({
  tabs, activeTab, petId,
}: {
  tabs: { key: TabKey; label: string }[];
  activeTab: TabKey;
  petId: string;
}) {
  return (
    <div style={{ display: "flex", gap: ".375rem", marginBottom: "1.5rem", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" as const }}>
      {tabs.map(t => (
        <Link
          key={t.key}
          href={`/dashboard/pets/${petId}?tab=${t.key}`}
          style={{
            padding: ".5rem 1.125rem", borderRadius: 100, fontSize: ".85rem",
            whiteSpace: "nowrap", textDecoration: "none", flexShrink: 0,
            background: activeTab === t.key ? "var(--ep-brand)" : "rgba(61,43,31,.07)",
            color: activeTab === t.key ? "var(--ep-bg-card)" : "var(--ep-text-muted)",
            fontWeight: activeTab === t.key ? 500 : 400,
            transition: "background .15s, color .15s",
          }}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
