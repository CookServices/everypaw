"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";

interface Pet {
  id: string;
  name: string;
  species: string;
  photo_url: string | null;
}

interface Props {
  pet: Pet;
  onComplete: () => void;  // called after "Continue to journal"
  onSkip: () => void;      // called when user clicks "Later"
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 1200;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = (height / width) * maxSize; width = maxSize; }
        else { width = (width / height) * maxSize; height = maxSize; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export default function OriginsFlow({ pet, onComplete, onSkip }: Props) {
  const { t, locale } = useLocale();
  const isFR = locale === "fr";
  const [phase, setPhase] = useState<"form" | "loading" | "success">("form");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [answer3, setAnswer3] = useState("");
  const [error, setError] = useState("");
  const [generatedStory, setGeneratedStory] = useState<{ title: string; story: string } | null>(null);
  const [photos, setPhotos] = useState<{ file: File; preview: string; uploaded: boolean; url: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const question1 = (t.onboarding.origins_q1 as string).replace("{petName}", pet.name);
  const question2 = (t.onboarding.origins_q2 as string).replace("{petName}", pet.name);
  const question3 = (t.onboarding.origins_q3 as string).replace("{petName}", pet.name);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    setUploadingPhotos(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of toAdd) {
      const preview = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { file, preview, uploaded: false, url: "" }]);
      try {
        const compressed = await compressImage(file);
        const filename = `${user!.id}/origins-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("pet-photos")
          .upload(filename, compressed, { contentType: "image/jpeg" });
        if (!uploadErr) {
          const { data } = supabase.storage.from("pet-photos").getPublicUrl(filename);
          setPhotos(prev => prev.map(p => p.preview === preview ? { ...p, uploaded: true, url: data.publicUrl } : p));
        }
      } catch {}
    }
    setUploadingPhotos(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (preview: string) => {
    setPhotos(prev => prev.filter(p => p.preview !== preview));
  };

  const handleGenerate = async () => {
    if (answer1.trim().length < 20) {
      setError(t.onboarding.origins_q1_required as string);
      return;
    }
    setError("");
    setPhase("loading");

    // Create photo entries for uploaded photos
    if (photos.some(p => p.uploaded)) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: petData } = await supabase.from("pets").select("birthdate").eq("id", pet.id).single();
        const entryDate = petData?.birthdate
          ? petData.birthdate.slice(0, 10)
          : new Date(Date.now() - 365 * 864e5).toISOString().split("T")[0];
        const uploadedUrls = photos.filter(p => p.uploaded).map(p => p.url);
        if (uploadedUrls.length > 0) {
          await supabase.from("entries").insert({
            pet_id: pet.id,
            user_id: user.id,
            content: isFR ? `Photos d'archive de ${pet.name}` : `Archive photos of ${pet.name}`,
            entry_date: entryDate,
            photo_urls: uploadedUrls,
            tags: ["origins"],
          });
        }
      }
    }

    try {
      const res = await fetch("/api/generate-origins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: pet.id, answer1, answer2, answer3 }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "origins_exists") {
          // Already generated, navigate to journal
          onComplete();
          return;
        }
        setError(isFR ? "Une erreur est survenue. Réessayez." : "An error occurred. Please try again.");
        setPhase("form");
        return;
      }
      setGeneratedStory({ title: data.title, story: data.story });
      setPhase("success");
    } catch {
      setError(isFR ? "Une erreur est survenue. Réessayez." : "An error occurred. Please try again.");
      setPhase("form");
    }
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%", padding: ".75rem 1rem", borderRadius: 12,
    border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA",
    fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F",
    outline: "none", boxSizing: "border-box", resize: "vertical",
    lineHeight: 1.6,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: ".78rem", fontWeight: 500, color: "#7A5C44",
    display: "block", marginBottom: ".4rem",
  };

  // ── Loading phase ────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(28,18,10,.55)", backdropFilter: "blur(8px)",
        padding: "1.5rem",
      }}>
        <div style={{
          background: "#FDFAF5", borderRadius: 24, padding: "3rem 2rem",
          maxWidth: 400, width: "100%", textAlign: "center",
          boxShadow: "0 32px 80px rgba(28,18,10,.25)",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1.25rem", animation: "pulse 1.5s ease-in-out infinite" }}>✨</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .75rem" }}>
            {t.onboarding.origins_generating as string}
          </h2>
          <p style={{ fontSize: ".85rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
            {isFR
              ? `Notre IA écrit l'histoire de ${pet.name}…`
              : `Our AI is crafting ${pet.name}'s story…`}
          </p>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.15)} }`}</style>
      </div>
    );
  }

  // ── Success phase, full-screen chapter display ──────────────────────────
  if (phase === "success" && generatedStory) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#FDFAF5", overflowY: "auto",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            {pet.photo_url && (
              <img src={pet.photo_url} alt={pet.name}
                style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginBottom: "1.25rem", border: "3px solid rgba(200,129,58,.25)" }} />
            )}
            <div style={{ fontSize: ".75rem", fontWeight: 600, color: "#C8813A", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: ".75rem", fontFamily: "sans-serif" }}>
              {isFR ? "Premier chapitre" : "First chapter"} · {pet.name}
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 600, color: "#3D2B1F", margin: 0, lineHeight: 1.2 }}>
              {generatedStory.title}
            </h1>
          </div>

          {/* Story text */}
          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(.95rem, 2.5vw, 1.1rem)", lineHeight: 1.85, color: "#3D2B1F", fontWeight: 400 }}>
            {generatedStory.story.split("\n\n").map((paragraph, i) => (
              <p key={i} style={{ margin: "0 0 1.5rem", textIndent: i === 0 ? 0 : "1.5rem" }}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid rgba(61,43,31,.1)" }}>
            <p style={{ fontSize: ".8rem", color: "#9A8070", marginBottom: "1.5rem", fontWeight: 300 }}>
              {isFR ? `Ce chapitre a été sauvegardé dans le journal de ${pet.name}.` : `This chapter has been saved to ${pet.name}'s journal.`}
            </p>
            <button
              onClick={onComplete}
              style={{
                padding: ".875rem 2rem", borderRadius: 100, border: "none",
                background: "#C8813A", color: "#FDFAF5",
                fontFamily: "'DM Sans', sans-serif", fontSize: ".95rem", fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t.onboarding.origins_continue as string} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form phase ───────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      background: "rgba(28,18,10,.55)", backdropFilter: "blur(8px)",
      padding: "1.5rem", overflowY: "auto",
    }}>
      <div style={{
        background: "#FDFAF5", borderRadius: 24, padding: "2rem",
        maxWidth: 540, width: "100%", marginTop: "2rem", marginBottom: "2rem",
        boxShadow: "0 32px 80px rgba(28,18,10,.25)",
        position: "relative",
      }}>

        {/* Skip button */}
        <button
          onClick={onSkip}
          style={{
            position: "absolute", top: "1.1rem", right: "1.1rem",
            fontSize: ".75rem", color: "#7A5C44", opacity: .6,
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", padding: ".25rem .5rem",
          }}
        >
          {t.onboarding.origins_skip as string}
        </button>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          {pet.photo_url && (
            <img src={pet.photo_url} alt={pet.name}
              style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", marginBottom: ".875rem", border: "2px solid rgba(200,129,58,.25)" }} />
          )}
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.35rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .5rem", lineHeight: 1.2 }}>
            {(t.onboarding.origins_title as string).replace("{petName}", pet.name)}
          </h2>
          <p style={{ fontSize: ".875rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
            {(t.onboarding.origins_desc as string).replace("{petName}", pet.name)}
          </p>
        </div>

        {/* Q1, required */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle}>
            {question1}
            <span style={{ color: "#A32D2D", marginLeft: ".2rem" }}>*</span>
          </label>
          <textarea
            value={answer1}
            onChange={e => setAnswer1(e.target.value)}
            placeholder={t.onboarding.origins_q1_placeholder as string}
            rows={3}
            maxLength={1000}
            style={textareaStyle}
          />
          {answer1.length > 0 && answer1.length < 20 && (
            <p style={{ fontSize: ".75rem", color: "#A32D2D", margin: ".3rem 0 0" }}>
              {t.onboarding.origins_q1_min as string}
            </p>
          )}
        </div>

        {/* Q2, optional */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle}>{question2}</label>
          <textarea
            value={answer2}
            onChange={e => setAnswer2(e.target.value)}
            placeholder={t.onboarding.origins_q2_placeholder as string}
            rows={2}
            maxLength={1000}
            style={textareaStyle}
          />
        </div>

        {/* Q3, optional */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle}>{question3}</label>
          <textarea
            value={answer3}
            onChange={e => setAnswer3(e.target.value)}
            placeholder={t.onboarding.origins_q3_placeholder as string}
            rows={2}
            maxLength={1000}
            style={textareaStyle}
          />
        </div>

        {/* Photo upload */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>{t.onboarding.origins_photos as string}</label>
          <p style={{ fontSize: ".75rem", color: "#9A8070", margin: "0 0 .75rem", lineHeight: 1.5 }}>
            {t.onboarding.origins_photos_hint as string}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", alignItems: "center" }}>
            {photos.map(p => (
              <div key={p.preview} style={{ position: "relative", width: 72, height: 72 }}>
                <img src={p.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, border: "1.5px solid rgba(61,43,31,.15)" }} />
                {!p.uploaded && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: "#7A5C44" }}>
                    ⏳
                  </div>
                )}
                <button onClick={() => removePhoto(p.preview)} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#3D2B1F", color: "#FDFAF5", border: "none", cursor: "pointer", fontSize: ".6rem", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}>
                  ✕
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhotos}
                style={{
                  width: 72, height: 72, borderRadius: 10,
                  border: "2px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.06)",
                  cursor: uploadingPhotos ? "not-allowed" : "pointer", color: "#C8813A",
                  fontSize: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                +
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: "none" }} />
        </div>

        {error && (
          <p style={{ fontSize: ".8rem", color: "#A32D2D", marginBottom: "1rem" }}>{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={answer1.trim().length < 20}
          style={{
            width: "100%", padding: ".875rem", borderRadius: 100, border: "none",
            background: answer1.trim().length >= 20 ? "#C8813A" : "rgba(200,129,58,.3)",
            color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500,
            cursor: answer1.trim().length >= 20 ? "pointer" : "not-allowed",
            textAlign: "center",
          }}
        >
          {t.onboarding.origins_cta as string}
        </button>
      </div>
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}
