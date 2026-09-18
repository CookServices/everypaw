"use client";

import { useState } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";

const NAME_MAX = 100;
const MESSAGE_MAX = 1000;

/**
 * Dépôt d'un hommage sans compte, sur une page pas encore réclamée. Le texte
 * ne s'affiche jamais ici : il reste caché jusqu'à ce que le créateur
 * réclame la page et le publie depuis l'onglet Hommages du tableau de bord.
 * Seule l'annonce du nombre en attente est visible.
 */
export default function PublicPageTributes({
  pageId,
  pendingCount,
  locale,
}: {
  pageId: string;
  pendingCount: number;
  locale: Locale;
}) {
  const t = getTranslations(locale).public_page;

  const [count, setCount] = useState(pendingCount);
  const [expanded, setExpanded] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const rule = "rgba(247,242,234,.06)";
  const soft = "rgba(247,242,234,.55)";

  const field = {
    width: "100%",
    padding: ".75rem 1rem",
    borderRadius: 12,
    border: "1.5px solid rgba(247,242,234,.12)",
    background: "rgba(247,242,234,.05)",
    color: "#F7F2EA",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: ".95rem",
    fontWeight: 300,
  } as const;

  const label = {
    display: "block",
    fontSize: ".8rem",
    fontWeight: 500,
    color: soft,
    marginBottom: ".4rem",
    fontFamily: "'DM Sans', sans-serif",
  } as const;

  const handleSubmit = async () => {
    setError("");
    const trimmedName = authorName.trim();
    const trimmedMessage = message.trim();
    if (trimmedName.length < 1 || trimmedName.length > NAME_MAX) return setError(t.tribute_error);
    if (trimmedMessage.length < 1 || trimmedMessage.length > MESSAGE_MAX) return setError(t.tribute_error);

    setStatus("sending");
    try {
      const res = await fetch("/api/memorial/tributes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageId, authorName: trimmedName, message: trimmedMessage, website }),
      });
      if (!res.ok) {
        setStatus("idle");
        return setError(t.tribute_error);
      }
      setCount((c) => c + 1);
      setStatus("done");
    } catch {
      setStatus("idle");
      setError(t.tribute_error);
    }
  };

  return (
    <section style={{ borderTop: `1px solid ${rule}`, paddingTop: "2.5rem", marginBottom: "3rem" }}>
      {count > 0 && (
        <p
          style={{
            fontSize: ".9rem",
            color: soft,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            lineHeight: 1.7,
            textAlign: "center",
            margin: "0 0 1.5rem",
          }}
        >
          {count === 1 ? t.tributes_pending_one : t.tributes_pending_many.replace("{count}", String(count))}
        </p>
      )}

      {status === "done" ? (
        <p
          style={{
            fontSize: ".9rem",
            fontStyle: "italic",
            color: soft,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            textAlign: "center",
            margin: 0,
          }}
        >
          {t.tribute_done}
        </p>
      ) : !expanded ? (
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: ".625rem 1.5rem",
              borderRadius: 100,
              fontSize: ".85rem",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              background: "rgba(200,129,58,.15)",
              border: "1px solid rgba(200,129,58,.3)",
              color: "#C8813A",
            }}
          >
            {t.tribute_form_title}
          </button>
        </div>
      ) : (
        <div
          style={{
            maxWidth: 420,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h3
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#F7F2EA",
              textAlign: "center",
              margin: 0,
            }}
          >
            {t.tribute_form_title}
          </h3>

          <div>
            <label style={label} htmlFor="ep-tribute-name">{t.tribute_name_label}</label>
            <input
              id="ep-tribute-name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={NAME_MAX}
              style={field}
            />
          </div>

          <div>
            <label style={label} htmlFor="ep-tribute-message">{t.tribute_message_label}</label>
            <textarea
              id="ep-tribute-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MESSAGE_MAX}
              rows={4}
              style={{ ...field, resize: "vertical" }}
            />
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
            disabled={status === "sending"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: ".75rem",
              borderRadius: 100,
              border: "none",
              background: "#C8813A",
              color: "#FDFAF5",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: ".95rem",
              fontWeight: 500,
              cursor: "pointer",
              opacity: status === "sending" ? 0.6 : 1,
            }}
          >
            {status === "sending" ? t.tribute_sending : t.tribute_submit}
          </button>
        </div>
      )}
    </section>
  );
}
