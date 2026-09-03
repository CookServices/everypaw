/**
 * The book cover artwork on its own, without the photo picker that surrounds it
 * on the order page. Extracted so the Stories tab can show the same cover from
 * the first chapter (spec P1-1) rather than growing a second, drifting one.
 *
 * Purely presentational: no state, no order-page dependency.
 */
interface Props {
  coverPhotoUrl: string | null;
  bookBg: string;
  bookAccentColor: string;
  bookTitleColor: string;
  displayCoverTitle: string;
  isMemorial: boolean;
  /** Empty string hides the line, as on the order page before a pet loads. */
  coverPeriod: string;
  petName: string;
  bookCoverLabel: string;
  /** Scales the whole cover down for the compact card in the Stories tab. */
  compact?: boolean;
}

export default function CoverArt({
  coverPhotoUrl,
  bookBg,
  bookAccentColor,
  bookTitleColor,
  displayCoverTitle,
  isMemorial,
  coverPeriod,
  petName,
  bookCoverLabel,
  compact = false,
}: Props) {
  return (
    <div style={{
      background: coverPhotoUrl ? "transparent" : bookBg,
      backgroundImage: coverPhotoUrl
        ? `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.65)), url('${coverPhotoUrl}')`
        : undefined,
      backgroundSize: coverPhotoUrl ? "cover" : undefined,
      backgroundPosition: coverPhotoUrl ? "center" : undefined,
      borderRadius: 20, padding: compact ? "2rem 1.5rem" : "3rem 2rem",
      textAlign: "center", marginBottom: compact ? 0 : "1.25rem",
      boxShadow: "0 12px 40px rgba(0,0,0,.25)",
      position: "relative", overflow: "hidden",
      transition: "background .3s",
    }}>
      {/* Decorative spine line */}
      <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 4, background: `${bookAccentColor}60`, borderRadius: 2 }} />
      <div style={{ fontSize: compact ? "2rem" : "2.75rem", marginBottom: compact ? ".875rem" : "1.25rem" }}>{isMemorial ? "🕊️" : "🐾"}</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: compact ? "1.4rem" : "1.9rem", fontWeight: 600, color: bookTitleColor, lineHeight: 1.25, marginBottom: ".75rem", transition: "color .3s" }}>
        {displayCoverTitle}
      </div>
      {coverPeriod && (
        <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: compact ? ".9rem" : "1rem", color: "rgba(247,242,234,.45)", marginBottom: compact ? "1rem" : "1.5rem" }}>
          {petName} · {coverPeriod}
        </div>
      )}
      <div style={{ width: 48, height: 2, background: bookAccentColor, margin: compact ? "0 auto 1rem" : "0 auto 1.5rem", borderRadius: 1, transition: "background .3s" }} />
      <div style={{ fontSize: ".7rem", color: "rgba(247,242,234,.3)", letterSpacing: ".12em", textTransform: "uppercase" }}>
        {bookCoverLabel}
      </div>
    </div>
  );
}
