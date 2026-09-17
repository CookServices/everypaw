"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { compressImage } from "@/lib/image";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { PageKind } from "@/lib/public-page";

/** Recadrage carré 400×400, identique au flux de `pets/new`. */
async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.9);
    };
    img.onerror = reject;
  });
}

const SPECIES = ["dog", "cat", "other"] as const;

export default function PublicPageForm({ kind, locale }: { kind: PageKind; locale: Locale }) {
  const t = getTranslations(locale).public_page;
  const router = useRouter();

  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<string>("dog");
  const [birthdate, setBirthdate] = useState("");
  const [deceasedAt, setDeceasedAt] = useState("");
  const [memories, setMemories] = useState(["", "", ""]);
  const [website, setWebsite] = useState(""); // honeypot

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const today = new Date().toISOString().slice(0, 10);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !area) return;
    const blob = await getCroppedBlob(cropSrc, area);
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  };

  const setMemory = (i: number, value: string) => {
    setMemories((prev) => prev.map((m, j) => (j === i ? value : m)));
  };

  const handleSubmit = async () => {
    setError("");

    // Validation côté client : l'erreur arrive avant l'attente de vingt
    // secondes. Le serveur revalide tout, c'est lui qui fait foi.
    const filled = memories.map((m) => m.trim()).filter((m) => m.length > 0);
    if (petName.trim().length < 2 || petName.trim().length > 40) return setError(t.error_name);
    if (kind === "memorial" && (!deceasedAt || deceasedAt > today)) return setError(t.error_deceased);
    if (birthdate && birthdate > today) return setError(t.error_birthdate);
    if (filled.length < 2 || filled.some((m) => m.length < 20 || m.length > 400)) {
      return setError(t.error_memories);
    }

    setStatus("loading");

    let photoUrl: string | null = null;
    if (photoBlob) {
      try {
        const compressed = await compressImage(new File([photoBlob], "photo.jpg", { type: "image/jpeg" }));
        const form = new FormData();
        form.append("file", new File([compressed], "photo.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/public-pages/photo", { method: "POST", body: form });
        if (!res.ok) throw new Error("upload");
        photoUrl = (await res.json()).url;
      } catch {
        setStatus("idle");
        return setError(t.error_photo);
      }
    }

    try {
      const res = await fetch("/api/public-pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          locale,
          petName: petName.trim(),
          species,
          birthdate: birthdate || null,
          deceasedAt: kind === "memorial" ? deceasedAt : null,
          memories: filled,
          photoUrl,
          website,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("idle");
        if (data.error === "rate_limited") return setError(t.error_rate_limited);
        if (data.error === "generation_failed") return setError(t.error_generation);
        return setError(t.error_generation);
      }

      // Le jeton ne voyage jamais dans l'URL : il reste dans ce navigateur, et
      // c'est lui qui prouvera plus tard que ce visiteur a créé la page.
      try {
        window.localStorage.setItem(`ep_claim_${data.slug}`, data.claimToken);
      } catch {
        // Navigation privée : la page existe quand même, le lien suffit.
      }
      router.push(`/p/${data.slug}`);
    } catch {
      setStatus("idle");
      setError(t.error_generation);
    }
  };

  const field = {
    width: "100%",
    padding: ".75rem 1rem",
    borderRadius: 12,
    border: "1.5px solid rgba(61,43,31,.15)",
    background: "#FDFAF5",
    color: "#3D2B1F",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: ".95rem",
    fontWeight: 300,
  } as const;

  const label = {
    display: "block",
    fontSize: ".8rem",
    fontWeight: 500,
    color: "#7A5C44",
    marginBottom: ".4rem",
    fontFamily: "'DM Sans', sans-serif",
  } as const;

  if (status === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
        {/* Animation volontairement réduite à une opacité pulsée, neutralisée
            par la règle globale prefers-reduced-motion de globals.css. */}
        <div style={{ fontSize: "2.5rem", marginBottom: "1.5rem", animation: "epPulse 2s ease-in-out infinite" }}>🐾</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: "#3D2B1F", margin: "0 0 .5rem" }}>
          {t.submitting}
        </h2>
        <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, fontFamily: "'DM Sans', sans-serif" }}>
          {t.submitting_hint}
        </p>
        <style>{"@keyframes epPulse{0%,100%{opacity:.35}50%{opacity:1}}"}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
      {cropSrc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(28,18,10,.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "1.5rem", width: "100%", maxWidth: 420 }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1rem" }}>
              {t.crop_title}
            </h3>
            <div style={{ position: "relative", width: "100%", height: 300, borderRadius: 12, overflow: "hidden", background: "#000" }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: "100%", margin: "1rem 0 .5rem", accentColor: "#C8813A" }}
            />
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                style={{ flex: 1, padding: ".6rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer" }}
              >
                {t.crop_cancel}
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                style={{ flex: 2, padding: ".6rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer" }}
              >
                {t.crop_confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: "#FDFAF5",
          borderRadius: 24,
          padding: "2rem",
          border: "1px solid rgba(61,43,31,.08)",
          boxShadow: "0 4px 40px rgba(61,43,31,.06)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div>
          <label style={label} htmlFor="ep-name">{t.name_label}</label>
          <input
            id="ep-name"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder={t.name_placeholder}
            maxLength={40}
            style={field}
          />
        </div>

        <div>
          <span style={label}>{t.species_label}</span>
          <div style={{ display: "flex", gap: ".5rem" }}>
            {SPECIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpecies(s)}
                style={{
                  flex: 1,
                  padding: ".6rem",
                  borderRadius: 100,
                  border: species === s ? "1.5px solid #C8813A" : "1.5px solid rgba(61,43,31,.15)",
                  background: species === s ? "rgba(200,129,58,.1)" : "transparent",
                  color: species === s ? "#B5712E" : "#7A5C44",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: ".875rem",
                  cursor: "pointer",
                }}
              >
                {s === "dog" ? t.species_dog : s === "cat" ? t.species_cat : t.species_other}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px" }}>
            <label style={label} htmlFor="ep-born">{t.birthdate_label}</label>
            <input id="ep-born" type="date" max={today} value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={field} />
          </div>
          {kind === "memorial" && (
            <div style={{ flex: "1 1 180px" }}>
              <label style={label} htmlFor="ep-passed">{t.deceased_label}</label>
              <input id="ep-passed" type="date" max={today} value={deceasedAt} onChange={(e) => setDeceasedAt(e.target.value)} style={field} />
            </div>
          )}
        </div>

        <div>
          <span style={label}>{t.photo_label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {photoPreview && (
              <img src={photoPreview} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
            )}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: ".6rem 1.25rem",
                borderRadius: 100,
                border: "1.5px solid rgba(61,43,31,.15)",
                color: "#7A5C44",
                fontSize: ".875rem",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
              }}
            >
              {photoPreview ? t.photo_change : t.photo_button}
              <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        <div>
          <label style={label} htmlFor="ep-memory-0">{t.memories_label}</label>
          <p style={{ fontSize: ".8rem", color: "#9A8070", fontWeight: 300, fontFamily: "'DM Sans', sans-serif", margin: "0 0 .75rem", lineHeight: 1.6 }}>
            {t.memories_hint}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {[0, 1, 2].map((i) => (
              <textarea
                key={i}
                id={`ep-memory-${i}`}
                value={memories[i]}
                onChange={(e) => setMemory(i, e.target.value)}
                placeholder={[t.memory_placeholder_1, t.memory_placeholder_2, t.memory_placeholder_3][i]}
                maxLength={400}
                rows={3}
                style={{ ...field, resize: "vertical" }}
              />
            ))}
          </div>
        </div>

        {/* Honeypot : hors écran, jamais rempli par un humain. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />

        {error && (
          <div
            role="alert"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: ".875rem",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: ".85rem",
            borderRadius: 100,
            border: "none",
            background: "#C8813A",
            color: "#FDFAF5",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t.submit}
        </button>
      </div>
    </div>
  );
}
