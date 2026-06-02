"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import PublicFooter from "@/components/PublicFooter";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const { locale } = useLocale();
  const isFR = locale === "fr";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError(isFR ? "Entrez votre adresse email." : "Enter your email address.");
      return;
    }
    setStatus("loading");
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (err) {
      setError(err.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
            Everypaw
          </Link>
          <p style={{ marginTop: ".5rem", fontSize: ".9rem", color: "#7A5C44", fontWeight: 300 }}>
            {isFR ? "Réinitialisez votre mot de passe" : "Reset your password"}
          </p>
        </div>

        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", boxShadow: "0 4px 40px rgba(61,43,31,.06)" }}>
          {status === "sent" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📬</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: ".75rem" }}>
                {isFR ? "Email envoyé !" : "Email sent!"}
              </h2>
              <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                {isFR
                  ? <>Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail.</>
                  : <>A reset link was sent to <strong>{email}</strong>. Check your inbox.</>}
              </p>
              <Link href="/auth/login" style={{ color: "#C8813A", fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
                {isFR ? "← Retour à la connexion" : "← Back to sign in"}
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .5rem" }}>
                {isFR ? "Mot de passe oublié ?" : "Forgot your password?"}
              </h2>
              <p style={{ fontSize: ".875rem", color: "#7A5C44", fontWeight: 300, margin: "0 0 1.5rem", lineHeight: 1.6 }}>
                {isFR
                  ? "Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe."
                  : "Enter your email and we'll send you a link to reset your password."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  style={{ padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none" }}
                />
                {error && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 16px" }}>
                    <p style={{ fontSize: ".8rem", color: "#991B1B", margin: 0 }}>{error}</p>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                  style={{ padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: status === "loading" ? .7 : 1 }}
                >
                  {status === "loading"
                    ? (isFR ? "Envoi…" : "Sending…")
                    : (isFR ? "Envoyer le lien →" : "Send reset link →")}
                </button>
              </div>
              <p style={{ textAlign: "center", marginTop: ".75rem", marginBottom: 0 }}>
                <Link href="/auth/login" style={{ fontSize: ".85rem", color: "#C8813A", fontWeight: 500, textDecoration: "none" }}>
                  {isFR ? "← Retour à la connexion" : "← Back to sign in"}
                </Link>
              </p>
              <p style={{ textAlign: "center", marginTop: ".5rem", marginBottom: 0 }}>
                <Link href="/" style={{ fontSize: ".8rem", color: "#9A8070", fontWeight: 400, textDecoration: "none" }}>
                  {isFR ? "← Retour à l'accueil" : "← Back to home"}
                </Link>
              </p>
            </>
          )}
        </div>

      </div>
      </div>
      <PublicFooter />
    </div>
  );
}
