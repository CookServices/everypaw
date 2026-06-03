"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import PublicFooter from "@/components/PublicFooter";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const { locale } = useLocale();
  const isFR = locale === "fr";

  // Redirect params from gift redeem flow
  const getRedirectTarget = () => {
    if (typeof window === "undefined") return "/dashboard";
    const p = new URLSearchParams(window.location.search);
    const redirect = p.get("redirect");
    const code = p.get("code");
    if (redirect) return code ? `${redirect}?code=${code}` : redirect;
    return "/dashboard";
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("error=otp_expired") || hash.includes("error_code=otp_expired")) {
      setShowResend(true);
      setError(isFR
        ? "Votre lien a expiré. Cliquez ci-dessous pour en recevoir un nouveau."
        : "Your link has expired. Click below to receive a new one.");
    }
  }, [isFR]);

  const handleEmailLogin = async () => {
    setStatus("loading");
    setError("");
    setShowResend(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed")) {
        setShowResend(true);
        setError(isFR
          ? "Votre email n'est pas encore confirmé. Renvoyez-vous le lien de confirmation."
          : "Your email is not confirmed yet. Resend the confirmation link.");
      } else if (msg.includes("missing email or phone")) {
        setError(isFR
          ? "L'adresse email est requise."
          : "Email is required.");
      } else if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        setError(isFR
          ? "Email ou mot de passe incorrect. Veuillez réessayer."
          : "Incorrect email or password. Please try again.");
      } else if (msg.includes("user not found") || msg.includes("no user found")) {
        setError(isFR
          ? "Aucun compte trouvé avec cet email."
          : "No account found with this email.");
      } else if (msg.includes("too many requests") || msg.includes("rate limit") || msg.includes("over_email_send_rate_limit")) {
        setError(isFR
          ? "Trop de tentatives. Réessayez dans quelques minutes."
          : "Too many attempts. Please try again in a few minutes.");
      } else {
        setError(isFR
          ? "Une erreur est survenue. Veuillez réessayer."
          : "An error occurred. Please try again.");
      }
      setStatus("error");
    } else {
      window.location.href = getRedirectTarget();
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError(isFR ? "Entrez votre adresse email pour renvoyer le lien." : "Enter your email to resend the link.");
      return;
    }
    setResendStatus("sending");
    const { error: resendErr } = await supabase.auth.resend({ type: "signup", email });
    if (resendErr) {
      setResendStatus("error");
      setError(isFR ? "Erreur lors de l'envoi. Veuillez réessayer." : "Error sending email. Please try again.");
    } else {
      setResendStatus("sent");
      setError(isFR ? `Un nouveau lien a été envoyé à ${email}` : `A new link has been sent to ${email}`);
    }
  };

  const handleGoogle = async () => {
    const target = getRedirectTarget();
    const callbackUrl = target === "/dashboard"
      ? `${window.location.origin}/auth/callback`
      : `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
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
            {isFR ? "Bon retour" : "Welcome back"}
          </p>
        </div>

        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", boxShadow: "0 4px 40px rgba(61,43,31,.06)" }}>
          <button onClick={handleGoogle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: ".75rem", padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", cursor: "pointer", marginBottom: "1.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
            {isFR ? "Continuer avec Google" : "Continue with Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(61,43,31,.1)" }} />
            <span style={{ fontSize: ".75rem", color: "#7A5C44" }}>{isFR ? "ou" : "or"}</span>
            <div style={{ flex: 1, height: 1, background: "rgba(61,43,31,.1)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            <input
              type="email"
              placeholder={isFR ? "Email" : "Email"}
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none" }}
            />
            <div style={{ position: "relative" }}>
              <PasswordInput
                value={password}
                placeholder={isFR ? "Mot de passe" : "Password"}
                onChange={setPassword}
                onEnter={handleEmailLogin}
              />
            </div>

            {error && (
              <div style={{ background: resendStatus === "sent" ? "rgba(46,94,30,.06)" : "#FEF2F2", border: `1px solid ${resendStatus === "sent" ? "rgba(46,94,30,.2)" : "#FCA5A5"}`, borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: ".8rem", color: resendStatus === "sent" ? "#2E5E1E" : "#991B1B", margin: 0 }}>{error}</p>
                {showResend && resendStatus !== "sent" && (
                  <button
                    onClick={handleResend}
                    disabled={resendStatus === "sending"}
                    style={{ marginTop: ".5rem", padding: ".4rem .875rem", borderRadius: 100, border: "1.5px solid #A32D2D", background: "transparent", color: "#A32D2D", fontSize: ".8rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: resendStatus === "sending" ? .7 : 1 }}
                  >
                    {resendStatus === "sending"
                      ? (isFR ? "Envoi…" : "Sending…")
                      : (isFR ? "Renvoyer le lien de confirmation" : "Resend confirmation link")}
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleEmailLogin}
              disabled={status === "loading"}
              style={{ padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: status === "loading" ? .7 : 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {status === "loading" ? (isFR ? "Connexion…" : "Signing in…") : (isFR ? "Se connecter" : "Sign in")}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: ".85rem", color: "#7A5C44" }}>
          <Link href="/auth/forgot-password" style={{ color: "#C8813A", fontWeight: 400, textDecoration: "none" }}>
            {isFR ? "Mot de passe oublié ?" : "Forgot your password?"}
          </Link>
        </p>
        <p style={{ textAlign: "center", marginTop: ".5rem", fontSize: ".85rem", color: "#7A5C44" }}>
          {isFR ? "Pas de compte ?" : "No account?"}{" "}
          <Link href="/auth/signup" style={{ color: "#C8813A", fontWeight: 500, textDecoration: "none" }}>
            {isFR ? "En créer un" : "Create one"}
          </Link>
        </p>
        <p style={{ textAlign: "center", marginTop: ".5rem", fontSize: ".8rem" }}>
          <Link href="/" style={{ color: "#9A8070", fontWeight: 400, textDecoration: "none" }}>
            {isFR ? "Retour à l'accueil" : "Back to home"}
          </Link>
        </p>
      </div>
      </div>
      <PublicFooter />
    </div>
  );
}

function PasswordInput({ value, placeholder, onChange, onEnter }: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onEnter()}
        style={{ width: "100%", boxSizing: "border-box", padding: ".75rem 2.75rem .75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none" }}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{ position: "absolute", right: ".75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9A8070", padding: 0, display: "flex", alignItems: "center" }}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
