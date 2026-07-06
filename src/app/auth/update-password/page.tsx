"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import PublicFooter from "@/components/PublicFooter";
import PasswordStrength from "@/components/PasswordStrength";

export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  const { locale } = useLocale();
  const isFR = locale === "fr";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL hash after redirect.
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setSessionReady(true);
    });
    // Also cover the case where the session is already present on mount.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!sessionReady) {
      setError(isFR
        ? "Lien de réinitialisation invalide ou expiré. Ouvrez le lien reçu par email, ou demandez-en un nouveau."
        : "Invalid or expired reset link. Open the link from your email, or request a new one.");
      return;
    }
    if (!password || password.length < 8) {
      setError(isFR ? "Le mot de passe doit faire au moins 8 caractères." : "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError(isFR ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
      return;
    }
    setStatus("loading");
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      const msg = err.message;
      const translated = isFR && msg.toLowerCase().includes("new password should be different")
        ? "Le nouveau mot de passe doit être différent de l'ancien."
        : msg;
      setError(translated);
      setStatus("error");
    } else {
      setStatus("done");
      setTimeout(() => router.push("/dashboard"), 2000);
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
        </div>

        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", boxShadow: "0 4px 40px rgba(61,43,31,.06)" }}>
          {status === "done" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✅</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", color: "#3D2B1F", marginBottom: ".75rem" }}>
                {isFR ? "Mot de passe mis à jour !" : "Password updated!"}
              </h2>
              <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.6 }}>
                {isFR ? "Redirection vers le tableau de bord…" : "Redirecting to your dashboard…"}
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1.5rem" }}>
                {isFR ? "Nouveau mot de passe" : "New password"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                <input
                  type="password"
                  placeholder={isFR ? "Nouveau mot de passe (min. 8 caractères)" : "New password (min. 8 characters)"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none" }}
                />
                <PasswordStrength password={password} isFR={isFR} />
                <input
                  type="password"
                  placeholder={isFR ? "Confirmer le mot de passe" : "Confirm password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
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
                    ? (isFR ? "Mise à jour…" : "Updating…")
                    : (isFR ? "Mettre à jour" : "Update password")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
      <PublicFooter />
    </div>
  );
}
