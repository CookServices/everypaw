import Link from "next/link";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Story } from "../constants";

type Translations = ReturnType<typeof getTranslations>;

interface Props {
  cardBg: string;
  cardBorder: string;
  selectedStoryIds: string[];
  visibleStories: Story[];
  locale: Locale;
  t: Translations;
  photoCount: number;
  monthsCount: number;
  estimatedPages: number;
  petId: string;
  accentColor: string;
  textPrimary: string;
  textMuted: string;
  isMemorial: boolean;
}

export default function ContentSummary({
  cardBg,
  cardBorder,
  selectedStoryIds,
  visibleStories,
  locale,
  t,
  photoCount,
  monthsCount,
  estimatedPages,
  petId,
  accentColor,
  textPrimary,
  textMuted,
  isMemorial,
}: Props) {
  return (
    <>
      {/* Content summary pill */}
      <div style={{
        background: cardBg, border: cardBorder, borderRadius: 14,
        padding: ".875rem 1.25rem", marginBottom: "1.5rem",
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: ".75rem", flexWrap: "wrap",
      }}>
        {[
          (() => { const n = selectedStoryIds.length || visibleStories.length; return n === 1 ? (locale === "fr" ? "1 chapitre" : "1 chapter") : t.order.summary_chapters.replace("{n}", String(n)); })(),
          t.order.summary_photos.replace("{n}", String(photoCount)),
          t.order.summary_months.replace("{n}", String(monthsCount)),
          t.order.summary_pages.replace("{n}", String(estimatedPages)),
        ].map((item, i, arr) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
            {i === 1 && photoCount === 0 ? (
              <Link
                href={`/dashboard/pets/${petId}?tab=journal`}
                title={locale === "fr" ? "Ajoutez des photos dans vos entrées du journal pour les inclure dans votre livre" : "Add photos to your journal entries to include them in your book"}
                style={{ fontSize: ".875rem", fontWeight: 400, color: "var(--ep-brand)", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px" }}
              >
                {item}
              </Link>
            ) : (
              <span style={{
                fontSize: ".875rem",
                fontWeight: i === 3 ? 600 : i === 1 ? 400 : 500,
                color: i === 3 ? accentColor : i === 1 ? accentColor : textPrimary,
              }}>
                {item}
              </span>
            )}
            {i < arr.length - 1 && <span style={{ color: isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)", fontSize: ".75rem" }}>·</span>}
          </span>
        ))}
      </div>
      {/* Note sur la dédicace */}
      <p style={{ fontSize: ".7rem", color: textMuted, textAlign: "center", margin: "-.75rem 0 1.5rem", fontFamily: "sans-serif", opacity: .7 }}>
        {t.order.summary_pages_note}
      </p>
    </>
  );
}
