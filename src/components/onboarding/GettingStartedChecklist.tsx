"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/hooks/useLocale";

const DISMISS_KEY = "ep_gs_dismissed";

interface Props {
  hasPets: boolean;
  hasEntries: boolean;
  hasStories: boolean;
  firstPetId?: string | null;
}

export default function GettingStartedChecklist({ hasPets, hasEntries, hasStories, firstPetId }: Props) {
  const { locale } = useLocale();
  const isFR = locale === "fr";
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const allDone = hasPets && hasEntries && hasStories;

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY) && !allDone) setVisible(true);
    } catch {}
  }, [allDone]);

  // Auto-hide when all tasks just completed
  useEffect(() => {
    if (allDone && visible) {
      const t = setTimeout(() => handleDismiss(true), 1800);
      return () => clearTimeout(t);
    }
  }, [allDone, visible]);

  const handleDismiss = (auto = false) => {
    setClosing(true);
    if (!auto) {
      try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    }
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  const tasks = [
    {
      done: hasPets,
      label: isFR ? "Créer le profil de votre animal" : "Create your pet's profile",
      href: hasPets ? null : "/dashboard/pets/new",
    },
    {
      done: hasEntries,
      label: isFR ? "Ajouter votre première entrée" : "Add your first journal entry",
      href: hasEntries || !firstPetId ? null : `/dashboard/pets/${firstPetId}`,
    },
    {
      done: hasStories,
      label: isFR ? "Générer votre première histoire IA" : "Generate your first AI story",
      href: hasStories || !firstPetId ? null : `/dashboard/pets/${firstPetId}?tab=stories`,
    },
  ];

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div
      style={{
        background: "#FDFAF5",
        border: "1px solid rgba(200,129,58,.25)",
        borderRadius: 16,
        padding: "1.25rem 1.5rem",
        marginBottom: "1.75rem",
        opacity: closing ? 0 : 1,
        transform: closing ? "translateY(-6px)" : "translateY(0)",
        transition: "opacity .3s ease, transform .3s ease",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <p style={{ margin: 0, fontSize: ".75rem", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#C8813A", fontFamily: "sans-serif" }}>
            {isFR ? "Premiers pas" : "Getting started"}
          </p>
          <p style={{ margin: ".1rem 0 0", fontSize: ".78rem", color: "#9A8070", fontWeight: 300 }}>
            {isFR ? `${doneCount}/3 complétées` : `${doneCount}/3 completed`}
          </p>
        </div>
        <button
          onClick={() => handleDismiss(false)}
          aria-label={isFR ? "Fermer" : "Close"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#9A8070", fontSize: "1.1rem", lineHeight: 1,
            padding: ".25rem", borderRadius: 6,
            transition: "color .12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#3D2B1F")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9A8070")}
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(61,43,31,.1)", borderRadius: 100, marginBottom: "1rem", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 100,
          background: allDone ? "#2E5E1E" : "#C8813A",
          width: `${(doneCount / 3) * 100}%`,
          transition: "width .5s ease, background .3s",
        }} />
      </div>

      {/* Tasks */}
      <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
        {tasks.map((task, i) => {
          const inner = (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: ".75rem",
                padding: ".5rem .625rem", borderRadius: 10,
                background: task.done ? "rgba(46,94,30,.05)" : "transparent",
                transition: "background .2s",
                cursor: task.href ? "pointer" : "default",
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: task.done ? "#2E5E1E" : "transparent",
                border: `2px solid ${task.done ? "#2E5E1E" : "rgba(61,43,31,.25)"}`,
                transition: "all .25s",
              }}>
                {task.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{
                fontSize: ".85rem", color: task.done ? "#7A5C44" : "#3D2B1F",
                fontWeight: task.done ? 300 : 400,
                textDecoration: task.done ? "line-through" : "none",
                transition: "all .25s",
              }}>
                {task.label}
              </span>
              {!task.done && task.href && (
                
              )}
            </div>
          );

          return task.href ? (
            <Link key={i} href={task.href} style={{ textDecoration: "none" }}>
              {inner}
            </Link>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>

      {allDone && (
        <p style={{ textAlign: "center", marginTop: "1rem", marginBottom: 0, fontSize: ".8rem", color: "#2E5E1E", fontWeight: 500 }}>
          {isFR ? "🎉 Bravo, vous êtes prêt !" : "🎉 You're all set!"}
        </p>
      )}
    </div>
  );
}
