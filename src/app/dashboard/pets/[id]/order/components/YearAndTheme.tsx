import type { Dispatch, SetStateAction, CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";
import type { ThemeId } from "../constants";
import { COVER_THEMES } from "../constants";

interface Props {
  availableYears: number[];
  labelColor: string;
  bookYearLabel: string;
  yearFilter: number | null;
  handleYearChange: (year: number | null) => void;
  inputStyle: CSSProperties;
  allYearsLabel: string;
  isMemorial: boolean;
  cardBg: string;
  cardBorder: string;
  locale: Locale;
  coverTheme: ThemeId;
  setCoverTheme: Dispatch<SetStateAction<ThemeId>>;
  accentColor: string;
  customTitle: string;
  setCustomTitle: Dispatch<SetStateAction<string>>;
  defaultCoverTitle: string;
  textMuted: string;
}

export default function YearAndTheme({
  availableYears,
  labelColor,
  bookYearLabel,
  yearFilter,
  handleYearChange,
  inputStyle,
  allYearsLabel,
  isMemorial,
  cardBg,
  cardBorder,
  locale,
  coverTheme,
  setCoverTheme,
  accentColor,
  customTitle,
  setCustomTitle,
  defaultCoverTitle,
  textMuted,
}: Props) {
  return (
    <>
      {/* Year filter, shown as soon as there is data (Point 9) */}
      {availableYears.length >= 1 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>
            {bookYearLabel}
          </label>
          <select
            value={yearFilter ?? ""}
            onChange={e => handleYearChange(e.target.value === "" ? null : Number(e.target.value))}
            style={inputStyle}
          >
            {availableYears.length > 1 && (
              <option value="">{allYearsLabel}</option>
            )}
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* Customization, theme + title */}
      {!isMemorial && (
        <div style={{ marginBottom: "1.25rem", background: cardBg, border: cardBorder, borderRadius: 14, padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".875rem", fontFamily: "sans-serif" }}>
            {locale === "fr" ? "Personnalisation" : "Customization"}
          </div>
          {/* Theme swatches */}
          <div style={{ marginBottom: ".875rem" }}>
            <div style={{ fontSize: ".7rem", color: textMuted, marginBottom: ".5rem", fontFamily: "sans-serif" }}>
              {locale === "fr" ? "Thème de couleur" : "Color theme"}
            </div>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {COVER_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setCoverTheme(theme.id)}
                  title={locale === "fr" ? theme.labelFr : theme.labelEn}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: theme.bg,
                    border: coverTheme === theme.id ? `2.5px solid ${accentColor}` : "2.5px solid transparent",
                    cursor: "pointer", position: "relative",
                    boxShadow: coverTheme === theme.id ? `0 0 0 1px ${accentColor}` : "none",
                    transition: "border .15s, box-shadow .15s",
                    overflow: "hidden",
                  }}
                >
                  {/* Accent color strip at bottom */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: theme.accent }} />
                </button>
              ))}
            </div>
            <div style={{ fontSize: ".65rem", color: textMuted, marginTop: ".35rem", fontFamily: "sans-serif" }}>
              {locale === "fr"
                ? (COVER_THEMES.find(theme => theme.id === coverTheme)?.labelFr ?? "")
                : (COVER_THEMES.find(theme => theme.id === coverTheme)?.labelEn ?? "")}
            </div>
          </div>
          {/* Custom title */}
          <div>
            <div style={{ fontSize: ".7rem", color: textMuted, marginBottom: ".5rem", fontFamily: "sans-serif" }}>
              {locale === "fr" ? "Titre du livre (optionnel)" : "Book title (optional)"}
            </div>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              maxLength={60}
              placeholder={defaultCoverTitle}
              style={{ ...inputStyle, fontSize: ".85rem" }}
            />
            <div style={{ fontSize: ".65rem", color: customTitle.length >= 54 ? "var(--ep-alert)" : textMuted, textAlign: "right", marginTop: ".25rem", fontFamily: "sans-serif" }}>
              {customTitle.length}/60
            </div>
          </div>
        </div>
      )}
    </>
  );
}
