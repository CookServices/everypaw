"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Species } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

async function getCroppedBlob(imageSrc: string, croppedAreaPixels: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0, size, size
      );
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("crop failed")), "image/jpeg", 0.9);
    };
    img.onerror = reject;
  });
}

export const dynamic = "force-dynamic";

const SPECIES_VALUES: { value: Species; emoji: string }[] = [
  { value: "dog", emoji: "🐶" },
  { value: "cat", emoji: "🐱" },
  { value: "rabbit", emoji: "🐰" },
  { value: "bird", emoji: "🐦" },
  { value: "other", emoji: "🐾" },
];

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 800;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = (height / width) * maxSize; width = maxSize; }
        else { width = (width / height) * maxSize; height = maxSize; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export default function NewPetPage() {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const SPECIES = SPECIES_VALUES.map(s => ({
    ...s,
    label: t.pet[`species_${s.value}` as keyof typeof t.pet] as string,
  }));

  const selectedSpeciesEmoji = SPECIES.find(s => s.value === species)?.emoji ?? "🐾";

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setCropSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
    const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    setPhotoFile(croppedFile);
    setPhotoPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError(t.pet.name_error); return; }
    setStatus("loading");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let photoUrl: string | null = null;
    if (photoFile && user) {
      const compressed = await compressImage(photoFile);
      const filename = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("pet-photos")
        .upload(filename, compressed, { contentType: "image/jpeg" });
      if (!uploadErr) {
        const { data } = supabase.storage.from("pet-photos").getPublicUrl(filename);
        photoUrl = data.publicUrl;
      }
    }

    const { error: err } = await supabase.from("pets").insert({
      user_id: user!.id, name: name.trim(), species,
      breed: breed || null, birthdate: birthdate || null,
      bio: bio || null, photo_url: photoUrl,
    });
    if (err) { setError(err.message); setStatus("error"); }
    else window.location.href = "/dashboard";
  };

  const labelStyle: React.CSSProperties = {
    fontSize: ".8rem", fontWeight: 500, color: "#7A5C44",
    textTransform: "uppercase", letterSpacing: ".06em",
    display: "block", marginBottom: ".5rem",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: ".75rem 1rem", borderRadius: 12,
    border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA",
    fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Crop modal */}
      {cropSrc && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(28,18,10,.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "1.5rem", width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1rem" }}>
              Recadrer la photo
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
              min={1} max={3} step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              style={{ width: "100%", margin: "1rem 0 .5rem", accentColor: "#C8813A" }}
            />
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button onClick={() => setCropSrc(null)} style={{ flex: 1, padding: ".6rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer" }}>
                Annuler
              </button>
              <button onClick={handleCropConfirm} style={{ flex: 2, padding: ".6rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer" }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", boxShadow: "0 4px 40px rgba(61,43,31,.06)" }}>

          {/* Photo upload */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", border: "2px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.06)", cursor: "pointer", overflow: "hidden", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset", flexShrink: 0 }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "2.5rem", lineHeight: 1, display: "block" }}>{selectedSpeciesEmoji}</span>
              )}
              <div style={{ position: "absolute", inset: 0, background: "rgba(61,43,31,.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
              >
                <span style={{ fontSize: "1.25rem" }}>📷</span>
              </div>
            </button>
            <span style={{ marginTop: ".6rem", fontSize: ".75rem", color: "#7A5C44", opacity: .7 }}>
              {photoPreview ? t.pet.photo_change : t.pet.photo_add}
            </span>
          </div>

          {/* Species */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>{t.pet.species}</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: ".5rem" }}>
              {SPECIES.map(s => (
                <button key={s.value} onClick={() => setSpecies(s.value)} style={{ padding: ".5rem .75rem", borderRadius: 100, border: `1.5px solid ${species === s.value ? "#C8813A" : "rgba(61,43,31,.15)"}`, background: species === s.value ? "rgba(200,129,58,.1)" : "transparent", color: species === s.value ? "#C8813A" : "#3D2B1F", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: ".35rem", minHeight: 40 }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text fields */}
          {[
            { label: t.pet.name, value: name, setter: setName, placeholder: "Luna, Biscuit, Mochi…", type: "text", max: undefined, maxLength: 40, required: true },
            { label: t.pet.breed, value: breed, setter: setBreed, placeholder: "Golden Retriever, Siamese…", type: "text", max: undefined, maxLength: 50, required: false },
            { label: t.pet.birthday, value: birthdate, setter: setBirthdate, placeholder: "", type: "date", max: new Date().toISOString().split("T")[0], maxLength: undefined, required: true },
          ].map(field => (
            <div key={field.label} style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>{field.label}{field.required && <span style={{ color: "#A32D2D", marginLeft: ".2rem" }}>*</span>}</label>
              <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder} max={field.max} maxLength={field.maxLength} style={inputStyle} />
              {field.maxLength !== undefined && (
                <div style={{ fontSize: ".7rem", textAlign: "right", marginTop: ".3rem", color: field.value.length >= field.maxLength * 0.9 ? "#A32D2D" : "#9A8070" }}>
                  {field.value.length}/{field.maxLength}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>{t.pet.bio}</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t.pet.bio_placeholder} rows={3} maxLength={300}
              style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ fontSize: ".7rem", textAlign: "right", marginTop: ".3rem", color: bio.length >= 270 ? "#A32D2D" : "#9A8070" }}>
              {bio.length}/300
            </div>
          </div>

          {error && <p style={{ fontSize: ".8rem", color: "#A32D2D", marginBottom: "1rem" }}>{error}</p>}

          <button onClick={handleCreate} disabled={status === "loading"} style={{ width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: status === "loading" ? .7 : 1 }}>
            {status === "loading" ? t.pet.creating : t.pet.create}
          </button>
        </div>
      </main>
    </div>
  );
}
