import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "@/lib/i18n";
import CoverArt from "./CoverArt";

interface Props {
  coverPhotoUrl: string | null;
  bookBg: string;
  bookAccentColor: string;
  bookTitleColor: string;
  displayCoverTitle: string;
  isMemorial: boolean;
  coverPeriod: string;
  petName: string;
  bookCoverLabel: string;
  coverPhotoLabel: string;
  availablePhotos: string[];
  setCoverPhotoUrl: Dispatch<SetStateAction<string | null>>;
  coverDefaultLabel: string;
  uploadingCover: boolean;
  handleCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  textMuted: string;
  labelColor: string;
  locale: Locale;
}

export default function BookCover({
  coverPhotoUrl,
  bookBg,
  bookAccentColor,
  bookTitleColor,
  displayCoverTitle,
  isMemorial,
  coverPeriod,
  petName,
  bookCoverLabel,
  coverPhotoLabel,
  availablePhotos,
  setCoverPhotoUrl,
  coverDefaultLabel,
  uploadingCover,
  handleCoverUpload,
  textMuted,
  labelColor,
  locale,
}: Props) {
  return (
    <>
      <CoverArt
        coverPhotoUrl={coverPhotoUrl}
        bookBg={bookBg}
        bookAccentColor={bookAccentColor}
        bookTitleColor={bookTitleColor}
        displayCoverTitle={displayCoverTitle}
        isMemorial={isMemorial}
        coverPeriod={coverPeriod}
        petName={petName}
        bookCoverLabel={bookCoverLabel}
      />

      {/* Cover photo picker (Point 10), always visible */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".875rem", fontFamily: "sans-serif" }}>
          {coverPhotoLabel}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", alignItems: "center" }}>
          {/* Default button */}
          <button
            onClick={() => setCoverPhotoUrl(null)}
            style={{
              width: 72, height: 72, borderRadius: 8,
              background: "var(--ep-text)",
              border: coverPhotoUrl === null ? "2px solid var(--ep-brand)" : "2px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(247,242,234,.6)", fontSize: ".6rem", fontFamily: "sans-serif",
              textAlign: "center", padding: 4, lineHeight: 1.2,
            }}
          >
            {coverDefaultLabel}
          </button>
          {/* Journal photo thumbnails (filtered by year) */}
          {availablePhotos.map((photoUrl, i) => (
            <button
              key={i}
              onClick={() => setCoverPhotoUrl(photoUrl)}
              style={{
                width: 72, height: 72, borderRadius: 8,
                border: coverPhotoUrl === photoUrl ? "2px solid var(--ep-brand)" : "2px solid transparent",
                padding: 0, cursor: "pointer", overflow: "hidden", background: "transparent",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </button>
          ))}
          {/* Upload custom cover photo */}
          <label style={{
            width: 72, height: 72, borderRadius: 8, flexShrink: 0,
            border: `2px dashed ${isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
            cursor: uploadingCover ? "wait" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, color: textMuted, fontSize: ".55rem", fontFamily: "sans-serif",
            textAlign: "center", lineHeight: 1.2,
            opacity: uploadingCover ? 0.5 : 1,
            transition: "opacity .15s",
          }}>
            <input
              type="file"
              accept="image/*"
              disabled={uploadingCover}
              onChange={handleCoverUpload}
              style={{ display: "none" }}
            />
            {uploadingCover
              ? <span style={{ fontSize: ".8rem" }}>⏳</span>
              : <>
                  <span style={{ fontSize: ".9rem" }}>+</span>
                  <span>{locale === "fr" ? "Importer" : "Upload"}</span>
                </>
            }
          </label>
          {/* Preview of custom uploaded photo (if not from journal) */}
          {coverPhotoUrl && !availablePhotos.includes(coverPhotoUrl) && (
            <div style={{ position: "relative", width: 72, height: 72 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPhotoUrl}
                alt=""
                style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", display: "block", border: "2px solid var(--ep-brand)" }}
              />
              <button
                onClick={() => setCoverPhotoUrl(null)}
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "var(--ep-brand)", border: "none",
                  color: "#fff", fontSize: ".6rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}
              >✕</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
