"use client";

import { useState } from "react";

interface Tribute {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
}

interface Props {
  petId: string;
  petName: string;
  initialTributes: Tribute[];
  locale: "en" | "fr";
}

const STRINGS = {
  en: {
    section_title: "Tributes",
    section_subtitle: "Messages from family & friends",
    no_tributes: "Be the first to share a memory.",
    form_title: "Leave a tribute",
    name_label: "Your name",
    name_placeholder: "Your name",
    message_label: "Your message",
    message_placeholder: "Share a memory or a few words…",
    submit: "Send",
    submitting: "Sending…",
    thank_you: "Thank you — your tribute has been submitted for review.",
    name_error: "Please enter your name (max 100 characters).",
    message_error: "Please enter a message (max 1000 characters).",
    chars_remaining: "{n} characters remaining",
  },
  fr: {
    section_title: "Hommages",
    section_subtitle: "Messages de proches et d'amis",
    no_tributes: "Soyez le premier à partager un souvenir.",
    form_title: "Laisser un hommage",
    name_label: "Votre prénom",
    name_placeholder: "Votre prénom",
    message_label: "Votre message",
    message_placeholder: "Partagez un souvenir ou quelques mots…",
    submit: "Envoyer",
    submitting: "Envoi…",
    thank_you: "Merci — votre hommage a été soumis pour validation.",
    name_error: "Veuillez indiquer votre prénom (100 caractères max).",
    message_error: "Veuillez saisir un message (1000 caractères max).",
    chars_remaining: "{n} caractères restants",
  },
};

export default function TributeSection({ petId, petName: _petName, initialTributes, locale }: Props) {
  const s = STRINGS[locale];
  const [tributes, setTributes] = useState<Tribute[]>(initialTributes);
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [messageError, setMessageError] = useState("");

  const validate = () => {
    let ok = true;
    if (!authorName.trim() || authorName.trim().length > 100) {
      setNameError(s.name_error);
      ok = false;
    } else {
      setNameError("");
    }
    if (!message.trim() || message.trim().length > 1000) {
      setMessageError(s.message_error);
      ok = false;
    } else {
      setMessageError("");
    }
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/memorial/tributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, authorName: authorName.trim(), message: message.trim() }),
      });
      if (res.ok) {
        setSubmitted(true);
        setAuthorName("");
        setMessage("");
      }
    } catch {
      // Non-fatal: form remains open
    }
    setSubmitting(false);
  };

  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  return (
    <div style={{ marginTop: "4rem" }}>
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: ".65rem", fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(200,129,58,.7)", marginBottom: ".5rem", fontFamily: "sans-serif" }}>
          {s.section_title}
        </div>
        <p style={{ fontSize: ".85rem", color: "rgba(247,242,234,.4)", fontFamily: "sans-serif", fontWeight: 300, margin: 0 }}>
          {s.section_subtitle}
        </p>
      </div>

      {/* Approved tributes */}
      {tributes.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2.5rem" }}>
          {tributes.map((tribute) => (
            <div key={tribute.id} style={{ borderTop: "1px solid rgba(247,242,234,.06)", paddingTop: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem", marginBottom: ".5rem" }}>
                <span style={{ fontSize: ".9rem", fontWeight: 600, color: "rgba(247,242,234,.8)", fontFamily: "sans-serif" }}>
                  {tribute.author_name}
                </span>
                <span style={{ fontSize: ".72rem", color: "rgba(247,242,234,.3)", fontFamily: "sans-serif" }}>
                  {new Date(tribute.created_at).toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <p style={{ fontSize: ".9rem", color: "rgba(247,242,234,.6)", lineHeight: 1.75, margin: 0, fontStyle: "italic" }}>
                {tribute.message}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: "center", fontSize: ".85rem", color: "rgba(247,242,234,.3)", fontStyle: "italic", marginBottom: "2.5rem", fontFamily: "sans-serif" }}>
          {s.no_tributes}
        </p>
      )}

      {/* Submission form */}
      <div style={{ borderTop: "1px solid rgba(247,242,234,.08)", paddingTop: "2rem" }}>
        <div style={{ fontSize: ".8rem", fontWeight: 500, color: "rgba(247,242,234,.5)", marginBottom: "1.25rem", fontFamily: "sans-serif", letterSpacing: ".04em" }}>
          {s.form_title}
        </div>

        {submitted ? (
          <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 12, padding: "1rem 1.25rem", fontSize: ".875rem", color: "rgba(200,129,58,.9)", fontFamily: "sans-serif" }}>
            {s.thank_you}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
            {/* Honeypot — must remain invisible */}
            <input
              type="text"
              name="website"
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div>
              <label style={{ fontSize: ".72rem", fontWeight: 500, color: "rgba(247,242,234,.4)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".35rem", fontFamily: "sans-serif" }}>
                {s.name_label}
              </label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder={s.name_placeholder}
                maxLength={100}
                style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 10, border: nameError ? "1.5px solid rgba(163,45,45,.6)" : "1.5px solid rgba(247,242,234,.1)", background: "rgba(247,242,234,.05)", color: "#F7F2EA", fontFamily: "sans-serif", fontSize: ".9rem", outline: "none", boxSizing: "border-box" }}
              />
              {nameError && <p style={{ fontSize: ".72rem", color: "rgba(163,45,45,.9)", margin: ".25rem 0 0", fontFamily: "sans-serif" }}>{nameError}</p>}
            </div>

            <div>
              <label style={{ fontSize: ".72rem", fontWeight: 500, color: "rgba(247,242,234,.4)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".35rem", fontFamily: "sans-serif" }}>
                {s.message_label}
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={s.message_placeholder}
                maxLength={1000}
                rows={4}
                style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 10, border: messageError ? "1.5px solid rgba(163,45,45,.6)" : "1.5px solid rgba(247,242,234,.1)", background: "rgba(247,242,234,.05)", color: "#F7F2EA", fontFamily: "sans-serif", fontSize: ".9rem", outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {messageError
                  ? <p style={{ fontSize: ".72rem", color: "rgba(163,45,45,.9)", margin: ".25rem 0 0", fontFamily: "sans-serif" }}>{messageError}</p>
                  : <span />}
                <span style={{ fontSize: ".7rem", color: "rgba(247,242,234,.25)", fontFamily: "sans-serif", marginTop: ".25rem" }}>
                  {s.chars_remaining.replace("{n}", String(1000 - message.length))}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ alignSelf: "flex-start", background: "rgba(200,129,58,.15)", border: "1px solid rgba(200,129,58,.35)", color: "#C8813A", padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".85rem", fontWeight: 500, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? .6 : 1, fontFamily: "sans-serif" }}
            >
              {submitting ? s.submitting : s.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
