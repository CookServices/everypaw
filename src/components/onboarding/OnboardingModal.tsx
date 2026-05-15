"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

interface Props {
  hasPets: boolean;
  hasEntries: boolean;
  hasStories: boolean;
  onComplete: () => void;
}

export default function OnboardingModal({ hasPets, hasEntries, hasStories, onComplete }: Props) {
  const { t } = useLocale();

  const initialStep = (() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("ep_onboarding_step");
      if (saved !== null) return parseInt(saved, 10);
    }
    return 0;
  })();

  const [step, setStep] = useState(initialStep);
  const [dismissing, setDismissing] = useState(false);

  const totalSteps = 3;

  const goTo = (n: number) => {
    sessionStorage.setItem("ep_onboarding_step", String(n));
    setStep(n);
  };

  const handleDismiss = async () => {
    setDismissing(true);
    sessionStorage.removeItem("ep_onboarding_step");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user!.id);
    onComplete();
  };

  const steps = [
    {
      emoji: "🐾",
      title: t.onboarding.step1_title,
      desc: t.onboarding.step1_desc,
      extra: null,
      example: null,
      primaryHref: "/dashboard/pets/new",
      primaryLabel: t.onboarding.step1_cta,
      skipLabel: t.onboarding.step1_skip,
    },
    {
      emoji: "✏️",
      title: t.onboarding.step2_title,
      desc: t.onboarding.step2_desc,
      example: t.onboarding.step2_example,
      extra: null,
      primaryHref: null,
      primaryLabel: t.onboarding.next,
      skipLabel: null,
    },
    {
      emoji: "✨",
      title: t.onboarding.step3_title,
      desc: t.onboarding.step3_desc,
      extra: t.onboarding.step3_how,
      example: null,
      primaryHref: null,
      primaryLabel: t.onboarding.start,
      skipLabel: null,
    },
  ];

  const current = steps[step];
  const isLast = step === totalSteps - 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(28,18,10,.55)", backdropFilter: "blur(8px)",
      padding: "1.5rem",
    }}>
      <div style={{
        background: "#FDFAF5", borderRadius: 24, padding: "2.5rem 2rem",
        maxWidth: 460, width: "100%",
        boxShadow: "0 32px 80px rgba(28,18,10,.25)",
        position: "relative",
        animation: "slideUp .25s ease",
      }}>

        {/* Skip button */}
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          style={{
            position: "absolute", top: "1.1rem", right: "1.1rem",
            fontSize: ".75rem", color: "#7A5C44", opacity: .6,
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", padding: ".25rem .5rem",
          }}
        >
          {t.onboarding.skip}
        </button>

        {/* Progress segments */}
        <div style={{ display: "flex", gap: 5, marginBottom: "1.75rem" }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 3, borderRadius: 100,
                background: i <= step ? "#C8813A" : "rgba(61,43,31,.12)",
                transition: "background .3s",
              }}
            />
          ))}
        </div>

        {/* Step counter + back button */}
        <div style={{ display: "flex", alignItems: "center", gap: ".625rem", margin: "0 0 .6rem" }}>
          {step > 0 && (
            <button
              onClick={() => goTo(step - 1)}
              aria-label="Étape précédente"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: "50%",
                border: "1.5px solid rgba(61,43,31,.18)",
                background: "transparent", cursor: "pointer",
                color: "#7A5C44", fontSize: ".9rem", lineHeight: 1,
                flexShrink: 0, transition: "border-color .12s, color .12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8813A"; (e.currentTarget as HTMLElement).style.color = "#C8813A"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.18)"; (e.currentTarget as HTMLElement).style.color = "#7A5C44"; }}
            >
              ←
            </button>
          )}
          <p style={{
            fontSize: ".68rem", fontWeight: 600, color: "#C8813A",
            letterSpacing: ".1em", textTransform: "uppercase",
            margin: 0, fontFamily: "sans-serif",
          }}>
            {t.onboarding.step_of
              .replace("{current}", String(step + 1))
              .replace("{total}", String(totalSteps))}
          </p>
        </div>

        {/* Emoji */}
        <div style={{ fontSize: "2.25rem", marginBottom: ".875rem", lineHeight: 1 }}>
          {current.emoji}
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: "Georgia, serif", fontSize: "1.4rem", fontWeight: 600,
          color: "#3D2B1F", margin: "0 0 .625rem", lineHeight: 1.2,
        }}>
          {current.title}
        </h2>

        {/* Description */}
        <p style={{
          fontSize: ".9rem", color: "#7A5C44", fontWeight: 300,
          lineHeight: 1.7, margin: "0 0 1.25rem",
        }}>
          {current.desc}
        </p>

        {/* Example quote (step 2) */}
        {current.example && (
          <div style={{
            background: "rgba(200,129,58,.06)",
            border: "1px solid rgba(200,129,58,.18)",
            borderRadius: 12, padding: ".875rem 1.1rem",
            marginBottom: "1.25rem",
          }}>
            <p style={{
              fontSize: ".85rem", color: "#3D2B1F",
              fontStyle: "italic", fontWeight: 300,
              lineHeight: 1.65, margin: 0,
            }}>
              "{current.example}"
            </p>
          </div>
        )}

        {/* AI explanation box (step 3) */}
        {current.extra && (
          <div style={{
            display: "flex", gap: ".75rem", alignItems: "flex-start",
            background: "rgba(200,129,58,.06)",
            border: "1px solid rgba(200,129,58,.18)",
            borderRadius: 12, padding: ".875rem 1.1rem",
            marginBottom: "1.25rem",
          }}>
            <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: 1 }}>🤖</span>
            <p style={{
              fontSize: ".85rem", color: "#3D2B1F",
              fontWeight: 300, lineHeight: 1.65, margin: 0,
            }}>
              {current.extra}
            </p>
          </div>
        )}

        {/* Primary CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: ".625rem", marginTop: "1.25rem" }}>
          {current.primaryHref ? (
            <Link
              href={current.primaryHref}
              onClick={() => sessionStorage.setItem("ep_onboarding_step", String(step + 1))}
              style={{
                display: "block", textAlign: "center",
                background: "#C8813A", color: "#FDFAF5",
                padding: ".75rem", borderRadius: 100,
                fontSize: ".9rem", fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {current.primaryLabel} →
            </Link>
          ) : (
            <button
              onClick={isLast ? handleDismiss : () => goTo(step + 1)}
              disabled={dismissing}
              style={{
                background: "#C8813A", color: "#FDFAF5",
                padding: ".75rem", borderRadius: 100,
                fontSize: ".9rem", fontWeight: 500,
                border: "none", cursor: dismissing ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: dismissing ? .7 : 1,
              }}
            >
              {current.primaryLabel}
            </button>
          )}

          {/* Secondary: "I'll do this later" on step 1 */}
          {current.skipLabel && (
            <button
              onClick={() => goTo(step + 1)}
              style={{
                background: "none", border: "none",
                fontSize: ".8rem", color: "#7A5C44",
                cursor: "pointer", fontFamily: "inherit",
                opacity: .65, padding: ".25rem",
              }}
            >
              {current.skipLabel}
            </button>
          )}
        </div>

      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
