"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Props {
  hasPets: boolean;
  hasEntries: boolean;
  hasStories: boolean;
  onComplete: () => void;
}

const steps = [
  {
    number: 1,
    title: "Welcome to Everypaw 🐾",
    description: "Start by creating your pet's profile. Add their name, breed, birthday — everything that makes them unique.",
    cta: "Create your pet's profile",
    href: "/dashboard/pets/new",
    completedText: "Pet profile created ✓",
    check: (props: Props) => props.hasPets,
  },
  {
    number: 2,
    title: "Capture your first moment",
    description: "Add a journal entry — a photo, a funny story, a milestone. Every moment counts.",
    cta: "Add your first entry",
    href: null,
    completedText: "First entry added ✓",
    check: (props: Props) => props.hasEntries,
  },
  {
    number: 3,
    title: "Generate your first story ✨",
    description: "Once you have 3 entries, our AI will weave them into a beautiful narrative — in your pet's own voice.",
    cta: "Generate a story",
    href: null,
    completedText: "First story generated ✓",
    check: (props: Props) => props.hasStories,
  },
];

export default function OnboardingModal({ hasPets, hasEntries, hasStories, onComplete }: Props) {
  const [dismissing, setDismissing] = useState(false);

  const currentStep = steps.findIndex(s => !s.check({ hasPets, hasEntries, hasStories, onComplete }));
  const allDone = currentStep === -1;

  const handleComplete = async () => {
    setDismissing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user!.id);
    onComplete();
  };

  return (
    <div style={{ background: "rgba(200,129,58,.06)", border: "1.5px solid rgba(200,129,58,.2)", borderRadius: 20, padding: "1.5rem", marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>
          {allDone ? "You're all set! 🎉" : "Get started with Everypaw"}
        </h2>
        <button onClick={handleComplete} disabled={dismissing} style={{ fontSize: ".75rem", color: "#7A5C44", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          {allDone ? "Dismiss" : "Skip for now"}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.25rem" }}>
        {steps.map((step, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 100, background: step.check({ hasPets, hasEntries, hasStories, onComplete }) ? "#C8813A" : "rgba(61,43,31,.12)" }} />
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        {steps.map((step, i) => {
          const done = step.check({ hasPets, hasEntries, hasStories, onComplete });
          const active = currentStep === i;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: ".875rem 1rem", borderRadius: 14, background: active ? "#FDFAF5" : "transparent", border: active ? "1px solid rgba(61,43,31,.08)" : "1px solid transparent", opacity: !done && !active ? .5 : 1 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#C8813A" : active ? "rgba(200,129,58,.15)" : "rgba(61,43,31,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done ? <span style={{ color: "#FDFAF5", fontSize: ".8rem" }}>✓</span> : <span style={{ fontSize: ".8rem", fontWeight: 500, color: active ? "#C8813A" : "#7A5C44" }}>{step.number}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: ".875rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .15rem" }}>{done ? step.completedText : step.title}</p>
                {active && <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300, lineHeight: 1.5 }}>{step.description}</p>}
              </div>
              {active && step.href && (
                <Link href={step.href} style={{ background: "#C8813A", color: "#FDFAF5", padding: ".4rem 1rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
                  {step.cta} →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <p style={{ fontSize: ".875rem", color: "#7A5C44", marginBottom: ".75rem", fontWeight: 300 }}>Your pet's story is taking shape. Keep adding moments! ✨</p>
          <button onClick={handleComplete} style={{ background: "#C8813A", color: "#FDFAF5", padding: ".5rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Got it →
          </button>
        </div>
      )}
    </div>
  );
}
