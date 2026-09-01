import { getTranslations, type Locale } from "@/lib/i18n";
import type { Step, Profile } from "../constants";

type Translations = ReturnType<typeof getTranslations>;

interface Props {
  profile: Profile | null;
  step: Step;
  isMemorial: boolean;
  textPrimary: string;
  textMuted: string;
  accentColor: string;
  locale: Locale;
  t: Translations;
  renewalDate: string | null;
  petName: string;
}

export default function UpsellBanners({
  profile,
  step,
  isMemorial,
  textPrimary,
  textMuted,
  accentColor,
  locale,
  t,
  renewalDate,
  petName,
}: Props) {
  return (
    <>
      {/* No-credits upsell, Print plan */}
      {profile !== null && profile.book_credits === 0 && profile.plan === "print" && step === "preview" && (
        <div style={{
          background: isMemorial ? "rgba(247,242,234,.04)" : "#FFF3E0",
          border: isMemorial ? "1px solid rgba(200,129,58,.25)" : "1px solid #F7C27A",
          borderRadius: 16, padding: "1.5rem", marginBottom: "1.75rem",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: ".75rem" }}>📚</div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem" }}>
            {t.order.print_extra_book_title}
          </h3>
          <p style={{ fontSize: ".875rem", color: textMuted, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 1rem" }}>
            {renewalDate
              ? locale === "fr"
                ? `Votre livre gratuit sera disponible à partir du ${renewalDate}, date de renouvellement de votre abonnement.`
                : `Your free book will be available again from ${renewalDate}, when your subscription renews.`
              : locale === "fr"
                ? "Votre livre gratuit sera disponible à la date de renouvellement de votre abonnement."
                : "Your free book will be available again when your subscription renews."
            }
          </p>
        </div>
      )}

      {/* Gate, Free plan */}
      {profile !== null && profile.plan === "free" && step === "preview" && (
        <div style={{
          background: isMemorial ? "rgba(247,242,234,.04)" : "#FFF3E0",
          border: isMemorial ? "1px solid rgba(200,129,58,.25)" : "1px solid #F7C27A",
          borderRadius: 16, padding: "1.5rem", marginBottom: "1.75rem",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: ".75rem" }}>📚</div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem" }}>
            {locale === "fr" ? "Fonctionnalité Premium Print" : "Premium Print Feature"}
          </h3>
          <p style={{ fontSize: ".875rem", color: textMuted, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 1rem" }}>
            {locale === "fr"
              ? "La commande d'un livre imprimé gratuit est réservée aux abonnés Premium Print. Passez à l'abonnement Print pour recevoir un livre gratuitement chaque année."
              : "Ordering a free printed book is available to Premium Print subscribers. Upgrade to Print to receive a book for free every year."}
          </p>
          <a
            href="/dashboard/settings"
            style={{
              background: accentColor, color: "var(--ep-bg-card)", border: "none",
              padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".875rem",
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              textDecoration: "none", display: "inline-block",
            }}
          >
            {locale === "fr" ? "Passer à Premium Print" : "Upgrade to Premium Print"}
          </a>
        </div>
      )}

      {/* No-credits upsell, non-Print plans */}
      {profile !== null && profile.book_credits === 0 && profile.plan !== "free" && profile.plan !== "print" && step === "preview" && (
        <div style={{
          background: isMemorial ? "rgba(247,242,234,.04)" : "#FFF3E0",
          border: isMemorial ? "1px solid rgba(200,129,58,.25)" : "1px solid #F7C27A",
          borderRadius: 16, padding: "1.5rem", marginBottom: "1.75rem",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: ".75rem" }}>📚</div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem" }}>
            {t.order.no_credits_title}
          </h3>
          <p style={{ fontSize: ".875rem", color: textMuted, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 1rem" }}>
            {t.order.no_credits_desc}
          </p>
          {/* No buy button here: purchasing goes through the main CTA below, so
              the shipping address is collected before payment. Paying from this
              banner skipped the address step and left the order unplaceable. */}
          <div style={{ display: "flex", flexDirection: "column", gap: ".625rem", alignItems: "center" }}>
            <a
              href="/dashboard/settings#plan"
              style={{
                fontSize: ".8rem", color: accentColor, textDecoration: "underline",
                textDecorationStyle: "dotted", textUnderlineOffset: "3px", cursor: "pointer",
              }}
            >
              {(t.order as Record<string, string>).no_credits_upgrade_cta ?? (locale === "fr" ? "Passer au plan Print" : "Upgrade to Print")}
            </a>
          </div>
        </div>
      )}

      {/* Memorial hero */}
      {isMemorial && petName && step === "preview" && (
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🕊️</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.75rem", fontWeight: 600, color: "var(--ep-bg)", marginBottom: ".5rem" }}>
            {t.memorial.order_tribute.replace("{name}", petName)}
          </h1>
          <p style={{ fontSize: ".9rem", color: "rgba(247,242,234,.5)", fontWeight: 300, lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
            {t.memorial.order_subtitle}
          </p>
        </div>
      )}
    </>
  );
}
