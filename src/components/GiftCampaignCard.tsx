"use client";

import Link from "next/link";
import { isGiftCampaignActive } from "@/lib/gift-campaign";
import type { getTranslations } from "@/lib/i18n";

/**
 * The end-of-year gift card on the dashboard (spec P2-1).
 *
 * Shown to free accounts between 15 November and 24 December, and to nobody
 * else: a subscriber already has the thing being offered. It switches itself
 * off by date, with no deploy and no environment variable.
 *
 * The copy insists the gift is a subscription rather than a parcel. Someone who
 * buys it expecting a book under the tree on the 25th has been misled, and the
 * recipient's book cannot exist before their journal does.
 */
export default function GiftCampaignCard({
  t, locale, plan, now,
}: {
  t: ReturnType<typeof getTranslations>;
  locale: string;
  plan: string;
  /** Injectable so the window can be exercised without touching the clock. */
  now?: Date;
}) {
  if (plan !== "free" || !isGiftCampaignActive(now)) return null;

  const isFR = locale === "fr";

  return (
    <div style={{
      background: "var(--ep-bg-card)",
      border: "1px solid rgba(200,129,58,.3)",
      borderRadius: 16,
      padding: "1.25rem 1.5rem",
      marginBottom: "1.5rem",
      display: "flex",
      flexDirection: "column",
      gap: ".5rem",
    }}>
      <p style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "var(--ep-text)", margin: 0 }}>
        {t.gift_campaign.title}
      </p>
      <p style={{ fontSize: ".875rem", color: "var(--ep-text-muted)", lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
        {t.gift_campaign.body}
      </p>
      <Link
        href={isFR ? "/fr/gift" : "/gift"}
        style={{
          alignSelf: "flex-start",
          marginTop: ".25rem",
          padding: ".625rem 1.25rem",
          borderRadius: 100,
          background: "var(--ep-brand)",
          color: "#fff",
          fontSize: ".875rem",
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        {t.gift_campaign.cta}
      </Link>
    </div>
  );
}
