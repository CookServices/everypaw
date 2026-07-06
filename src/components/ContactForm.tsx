"use client";

import { useState } from "react";
import { EMAIL_REGEX } from "@/lib/validation";

const SUBJECTS = [
  "Question générale",
  "Problème technique",
  "Commande & livraison",
  "Facturation & abonnement",
  "Autre",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: ".75rem 1rem",
  borderRadius: 12,
  border: "1.5px solid rgba(61,43,31,.15)",
  background: "#F7F2EA",
  fontFamily: "inherit",
  fontSize: ".9rem",
  color: "#3D2B1F",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: ".75rem",
  fontWeight: 500,
  color: "#7A5C44",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: ".4rem",
};

const errorStyle: React.CSSProperties = {
  fontSize: ".78rem",
  color: "#991B1B",
  margin: ".3rem 0 0 .25rem",
};

export default function ContactForm() {
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ subject?: string; email?: string; message?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const validate = () => {
    const e: typeof errors = {};
    if (!subject) e.subject = "Veuillez sélectionner un objet.";
    if (!email.trim()) e.email = "L'adresse email est requise.";
    else if (!EMAIL_REGEX.test(email)) e.email = "L'adresse email n'est pas valide.";
    if (!message.trim()) e.message = "Le message est requis.";
    else if (message.trim().length < 20) e.message = "Le message doit contenir au moins 20 caractères.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, email, message }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>✓</div>
        <p style={{ fontSize: ".95rem", color: "#3D2B1F", fontWeight: 500, margin: "0 0 .4rem" }}>
          Votre message a bien été envoyé.
        </p>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", fontWeight: 300, margin: 0 }}>
          Nous vous répondrons sous 24h.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "2rem", border: "1px solid rgba(61,43,31,.08)" }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1.5rem" }}>
        Envoyez-nous un message
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

        {/* Objet */}
        <div>
          <label style={labelStyle}>Objet</label>
          <select
            value={subject}
            onChange={e => { setSubject(e.target.value); setErrors(v => ({ ...v, subject: undefined })); }}
            style={{ ...inputStyle, border: `1.5px solid ${errors.subject ? "#FCA5A5" : "rgba(61,43,31,.15)"}`, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A5C44' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", paddingRight: "2.5rem", cursor: "pointer" }}
          >
            <option value="" disabled>Sélectionner un objet…</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.subject && <p style={errorStyle}>{errors.subject}</p>}
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Votre email</label>
          <input
            type="email"
            placeholder="vous@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email && EMAIL_REGEX.test(e.target.value)) setErrors(v => ({ ...v, email: undefined })); }}
            onBlur={() => { if (!email.trim()) setErrors(v => ({ ...v, email: "L'adresse email est requise." })); else if (!EMAIL_REGEX.test(email)) setErrors(v => ({ ...v, email: "L'adresse email n'est pas valide." })); }}
            style={{ ...inputStyle, border: `1.5px solid ${errors.email ? "#FCA5A5" : "rgba(61,43,31,.15)"}` }}
          />
          {errors.email && <p style={errorStyle}>{errors.email}</p>}
        </div>

        {/* Message */}
        <div>
          <label style={labelStyle}>
            Votre message
            <span style={{ fontWeight: 300, textTransform: "none", letterSpacing: 0, marginLeft: ".5rem", color: message.trim().length < 20 ? "#C8813A" : "#7A5C44" }}>
              ({message.trim().length}/20 min)
            </span>
          </label>
          <textarea
            placeholder="Décrivez votre demande en détail…"
            value={message}
            rows={5}
            onChange={e => { setMessage(e.target.value); if (errors.message && e.target.value.trim().length >= 20) setErrors(v => ({ ...v, message: undefined })); }}
            style={{ ...inputStyle, resize: "vertical", border: `1.5px solid ${errors.message ? "#FCA5A5" : "rgba(61,43,31,.15)"}` }}
          />
          {errors.message && <p style={errorStyle}>{errors.message}</p>}
        </div>

        {/* Error banner */}
        {status === "error" && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 16px" }}>
            <p style={{ fontSize: ".8rem", color: "#991B1B", margin: 0 }}>
              Une erreur est survenue. Veuillez réessayer ou nous écrire directement à{" "}
              <a href="mailto:hello@everypaw.app" style={{ color: "#991B1B", fontWeight: 500 }}>hello@everypaw.app</a>.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={status === "loading"}
          style={{ padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? .6 : 1, transition: "opacity .15s" }}
        >
          {status === "loading" ? "Envoi en cours…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
