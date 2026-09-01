import type { Dispatch, SetStateAction } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Story, Entry, Pet, Profile, Step } from "../constants";

type Translations = ReturnType<typeof getTranslations>;

interface Props {
  photoEntries: Entry[];
  labelColor: string;
  t: Translations;
  isMemorial: boolean;
  pet: Pet | null;
  approvedTributesCount: number;
  includeTributes: boolean;
  setIncludeTributes: Dispatch<SetStateAction<boolean>>;
  textPrimary: string;
  locale: Locale;
  visibleStories: Story[];
  selectedStoryIds: string[];
  tooFewContent: boolean;
  checkoutLoading: boolean;
  profile: Profile | null;
  setStep: (step: Step) => void;
  accentColor: string;
  checkoutError: boolean;
  handleFullPreview: () => void;
  previewLoading: boolean;
  previewLabel: string;
  handleDownloadPdf: () => void;
  downloadLoading: boolean;
  handleSave: (name?: string) => void;
  saving: boolean;
  saveSuccess: boolean;
  saveError: boolean;
  textMuted: string;
}

export default function PreviewActions({
  photoEntries,
  labelColor,
  t,
  isMemorial,
  pet,
  approvedTributesCount,
  includeTributes,
  setIncludeTributes,
  textPrimary,
  locale,
  visibleStories,
  selectedStoryIds,
  tooFewContent,
  checkoutLoading,
  profile,
  setStep,
  accentColor,
  checkoutError,
  handleFullPreview,
  previewLoading,
  previewLabel,
  handleDownloadPdf,
  downloadLoading,
  handleSave,
  saving,
  saveSuccess,
  saveError,
  textMuted,
}: Props) {
  return (
    <>
      {/* Photo preview (first available photo) */}
      {photoEntries.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".875rem", fontFamily: "sans-serif" }}>
            {t.order.preview_photos_page}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: photoEntries.length > 1 ? "1fr 1fr" : "1fr", gap: ".625rem" }}>
            {photoEntries.slice(0, 2).map(e => (
              <div key={e.id} style={{ borderRadius: 14, overflow: "hidden", aspectRatio: "4/3", background: isMemorial ? "rgba(247,242,234,.04)" : "rgba(61,43,31,.05)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.photo_urls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tributes chapter option (deceased pets with approved tributes) */}
      {pet?.deceased_at && approvedTributesCount > 0 && (
        <div style={{ background: isMemorial ? "rgba(247,242,234,.04)" : "rgba(200,129,58,.04)", border: isMemorial ? "1px solid rgba(247,242,234,.08)" : "1px solid rgba(200,129,58,.2)", borderRadius: 12, padding: ".875rem 1rem", marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeTributes}
              onChange={e => setIncludeTributes(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--ep-brand)", flexShrink: 0 }}
            />
            <span style={{ fontSize: ".875rem", color: textPrimary, lineHeight: 1.5 }}>
              {locale === "fr"
                ? `🕊️ Inclure la page des hommages (${approvedTributesCount} message${approvedTributesCount > 1 ? "s" : ""})`
                : `🕊️ Include tributes page (${approvedTributesCount} message${approvedTributesCount > 1 ? "s" : ""})`}
            </span>
          </label>
        </div>
      )}

      {/* CTA buttons */}
      {visibleStories.length > 0 && selectedStoryIds.length === 0 && (
        <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.3)", borderRadius: 12, padding: ".75rem 1rem", marginBottom: ".25rem", fontSize: ".8rem", color: "var(--ep-brand)", fontFamily: "sans-serif" }}>
          {locale === "fr" ? "Sélectionnez au moins un chapitre pour continuer." : "Select at least one chapter to continue."}
        </div>
      )}
      {tooFewContent && selectedStoryIds.length > 0 && (
        <div style={{ background: "rgba(163,45,45,.06)", border: "1px solid rgba(163,45,45,.25)", borderRadius: 12, padding: ".75rem 1rem", marginBottom: ".25rem", fontSize: ".8rem", color: "var(--ep-alert)", fontFamily: "sans-serif" }}>
          {locale === "fr"
            ? "Pas assez de chapitres pour imprimer un livre (minimum 7 chapitres requis)."
            : "Not enough chapters to print a book (minimum 7 chapters required)."}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        {/* Hide the main CTA when the user has no credits, with two exceptions.
            Free: shown disabled, so the gate is visible rather than puzzling.
            Print with no credits: shown and enabled, because that is the paid
            extra-copy path. Hiding it there stranded Print subscribers with a
            banner and no way to buy, while the label and the checkout call for
            exactly that case already existed just below. */}
        {((profile?.book_credits ?? 0) > 0 || profile?.plan === "free" || profile?.plan === "print") && <button
          onClick={() => {
            setStep("address");
          }}
          disabled={(visibleStories.length > 0 && selectedStoryIds.length === 0) || tooFewContent || checkoutLoading || profile?.plan === "free"}
          style={{
            width: "100%", padding: ".875rem 1rem", borderRadius: 100, border: "none",
            background: accentColor, color: "var(--ep-bg-card)", fontFamily: "inherit",
            fontSize: ".9rem", fontWeight: 600, cursor: (visibleStories.length > 0 && selectedStoryIds.length === 0) || tooFewContent || checkoutLoading || profile?.plan === "free" ? "not-allowed" : "pointer",
            opacity: (visibleStories.length > 0 && selectedStoryIds.length === 0) || tooFewContent || checkoutLoading || profile?.plan === "free" ? .5 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 48,
          }}
        >
          {checkoutLoading
            ? (locale === "fr" ? "Chargement…" : "Loading…")
            : profile?.plan === "print" && profile.book_credits === 0
              ? t.order.print_extra_book_cta
              : t.order.preview_cta}
        </button>}
        {checkoutError && (
          <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", textAlign: "center", margin: "-.25rem 0 0" }}>
            {locale === "fr"
              ? "Une erreur est survenue. Réessaie dans un instant."
              : "Something went wrong. Try again in a moment."}
          </p>
        )}
        <button
          onClick={handleFullPreview}
          disabled={previewLoading}
          style={{
            width: "100%", padding: ".75rem 1rem", borderRadius: 100,
            border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
            background: "transparent", fontFamily: "inherit", fontSize: ".875rem",
            color: textPrimary, cursor: previewLoading ? "wait" : "pointer",
            opacity: previewLoading ? .6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", minHeight: 44,
          }}
        >
          <span>{previewLoading ? "…" : previewLabel}</span>
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadLoading}
          style={{
            width: "100%", padding: ".75rem 1rem", borderRadius: 100,
            border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
            background: "transparent", fontFamily: "inherit", fontSize: ".875rem",
            color: textPrimary, cursor: downloadLoading ? "wait" : "pointer",
            opacity: downloadLoading ? .6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", minHeight: 44,
          }}
        >
          <span>{downloadLoading ? "…" : (locale === "fr" ? "Télécharger le PDF" : "Download PDF")}</span>
        </button>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          style={{
            width: "100%", padding: ".75rem 1rem", borderRadius: 100,
            border: `1.5px solid ${saveSuccess ? "var(--ep-status-ship)" : isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
            background: saveSuccess ? "rgba(106,158,120,.1)" : "transparent",
            fontFamily: "inherit", fontSize: ".875rem",
            color: saveSuccess ? "var(--ep-status-ship)" : textMuted,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? .6 : 1,
            transition: "all .2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", minHeight: 44,
          }}
        >
          {saving ? "…" : saveSuccess
            ? (locale === "fr" ? "✓ Sauvegardé" : "✓ Saved")
            : (locale === "fr" ? "Sauvegarder" : "Save")}
        </button>
        {saveError && (
          <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", textAlign: "center", margin: 0 }}>
            {locale === "fr"
              ? "Impossible d'enregistrer le brouillon (limite de brouillons peut-être atteinte). Réessaie dans un instant."
              : "Could not save the draft (you may have reached the draft limit). Try again in a moment."}
          </p>
        )}
      </div>
    </>
  );
}
