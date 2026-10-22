"use client";

import { useEffect, useState } from "react";
import type { getTranslations } from "@/lib/i18n";

export type UpsellSource = "story" | "book" | "backfill" | "next_chapter";
export type UpsellPlan = "digital" | "print_annual";

/**
 * Free-plan upsell CTAs open the Stripe checkout directly instead of detouring
 * through settings, and record the click first.
 *
 * The click event is fire-and-forget (`keepalive` so it survives the redirect):
 * a failure there must never cost the user their checkout.
 */
export function useUpsellCheckout(t: ReturnType<typeof getTranslations>) {
  const [pending, setPending] = useState<UpsellSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Back from Stripe, the page may come out of the bfcache with `pending`
  // still set: the CTA would stay frozen on its loading label.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setPending(null);
      setError(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const startCheckout = async (source: UpsellSource, plan: UpsellPlan, petId: string | null) => {
    setPending(source);
    setError(null);

    if (petId) {
      fetch("/api/events/upsell-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, source }),
        keepalive: true,
      }).catch(() => {});
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => null);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(res.status === 409 ? t.upsell.already_subscribed : t.upsell.error);
    } catch {
      setError(t.upsell.error);
    }
    setPending(null);
  };

  return { startCheckout, pending, error };
}
