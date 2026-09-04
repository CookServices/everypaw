"use client";

import { useState } from "react";
import Link from "next/link";
import type { Entry, Pet, Story } from "@/types";
import { COVER_THEMES } from "../order/constants";
import { calcCoverPeriod } from "../order/utils";
import CoverArt from "../order/components/CoverArt";
import PreviewModal from "../order/components/PreviewModal";
import { Translations } from "./types";

/**
 * The book, shown from the first chapter (spec P1-1).
 *
 * The order page was the only place a user could see their cover, and it asks
 * for seven chapters before it is of any use. A free user, who gets one
 * chapter, decides whether to pay long before reaching it.
 *
 * The preview opens on every plan. What the plan changes is the ordering, and
 * when it is closed the card says why rather than showing a dead button.
 *
 * Preview state is local: nothing else on the page reads it, so lifting it to
 * the parent would only add three props to a component that already carries
 * two dozen.
 */
export default function BookPreviewCard({
  t, isFR, pet, stories, entries, userPlan,
}: {
  t: Translations;
  isFR: boolean;
  pet: Pet;
  stories: Story[];
  entries: Entry[];
  userPlan: string;
}) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const isMemorial = !!pet.deceased_at;
  const theme = COVER_THEMES[0];
  const coverPhotoUrl = (isMemorial ? pet.memorial_photo_url : null) ?? pet.photo_url;
  const coverTitle = isMemorial
    ? t.order.memorial_cover_title.replace("{name}", pet.name)
    : t.order.book_cover_title.replace("{name}", pet.name);

  const openPreview = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/preview-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: pet.id, lang: isFR ? "fr" : "en" }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setPreviewHtml(await res.text());
      // Funnel step, best effort: a failure here must not cost the user their
      // preview. Deduplicated server-side, so repeated openings are harmless.
      fetch("/api/events/book-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: pet.id }),
      }).catch(() => {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {previewHtml && (
        <PreviewModal
          previewHtml={previewHtml}
          previewStale={false}
          previewLabel={isFR ? "Aperçu complet du livre" : "Full book preview"}
          closeLabel={isFR ? "Fermer" : "Close"}
          onClose={() => setPreviewHtml(null)}
        />
      )}

      <div style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "1.5rem", border: "1px solid rgba(61,43,31,.08)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .25rem" }}>
            {t.stories.book_card_title}
          </h3>
          <p style={{ fontSize: ".8rem", color: "var(--ep-text-muted)", margin: 0, fontWeight: 300 }}>
            {t.stories.book_card_hint}
          </p>
        </div>

        <CoverArt
          compact
          coverPhotoUrl={coverPhotoUrl}
          bookBg={isMemorial ? "#0E0B08" : theme.bg}
          bookAccentColor={isMemorial ? "var(--ep-memorial)" : theme.accent}
          bookTitleColor={isMemorial ? "#F7C27A" : theme.title}
          displayCoverTitle={coverTitle}
          isMemorial={isMemorial}
          coverPeriod={calcCoverPeriod(pet, stories, entries, null)}
          petName={pet.name}
          bookCoverLabel={t.order.book_cover_label}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: ".625rem", alignItems: "center" }}>
          <button
            onClick={openPreview}
            disabled={loading}
            style={{
              padding: ".625rem 1.25rem", borderRadius: 100, border: "none",
              background: "var(--ep-brand)", color: "#fff",
              fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500,
              cursor: loading ? "wait" : "pointer", opacity: loading ? .7 : 1,
              minHeight: 36,
            }}
          >
            {loading ? t.stories.book_card_preview_loading : t.stories.book_card_preview_cta}
          </button>

          {userPlan === "free" ? (
            <span style={{ fontSize: ".78rem", color: "var(--ep-text-muted)", fontWeight: 300, lineHeight: 1.5 }}>
              {t.stories.book_card_free_reason}{" "}
              <Link href="/dashboard/settings" style={{ color: "var(--ep-brand)", textDecoration: "none", fontWeight: 500 }}>
                {t.stories.free_upsell_cta}
              </Link>
            </span>
          ) : (
            <Link
              href={`/dashboard/pets/${pet.id}/order`}
              style={{
                padding: ".625rem 1.25rem", borderRadius: 100,
                border: "1.5px solid rgba(200,129,58,.35)", color: "var(--ep-brand)",
                fontSize: ".85rem", fontWeight: 500, textDecoration: "none",
                display: "inline-flex", alignItems: "center", minHeight: 36,
              }}
            >
              {t.stories.book_card_order_cta}
            </Link>
          )}
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: ".78rem", color: "var(--ep-error-ink)", background: "var(--ep-error-bg)", border: "1px solid var(--ep-error-border)", borderRadius: 8, padding: ".625rem .875rem" }}>
            {t.stories.book_card_preview_error}
          </p>
        )}
      </div>
    </>
  );
}
