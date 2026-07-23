"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { getSignupError } from "@/lib/auth-errors";
import { log } from "@/lib/log";
import PublicFooter from "@/components/PublicFooter";
import PasswordStrength from "@/components/PasswordStrength";

export const dynamic = "force-dynamic";

import { EMAIL_REGEX, isSafeRelativePath } from "@/lib/validation";

export default function SignupPage() {
  const { locale, t } = useLocale();
  const isFR = locale === "fr";

  // Plan banner
  const [selectedPlan] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("plan");
  });

  const PLAN_LABELS: Record<string, { name: string; price: string; perks: string }> = {
    digital: {
      name: "Premium Digital",
      price: isFR ? "4,99 €/mois" : "$4.99/mo",
      perks: isFR ? "Histoires IA illimitées · Export PDF" : "Unlimited AI stories · PDF export",
    },
    print_annual: {
      name: "Premium Print",
      price: isFR ? "79 €/an" : "$79/yr",
      perks: isFR ? "Livre hardcover inclus · Livraison offerte" : "Hardcover book included · Free shipping",
    },
  };

  const planInfo = selectedPlan ? PLAN_LABELS[selectedPlan] ?? null : null;

  // Redirect params from gift redeem / invite flows
  const getRedirectTarget = () => {
    if (typeof window === "undefined") return "/dashboard";
    const p = new URLSearchParams(window.location.search);
    const redirect = p.get("redirect");
    const next = p.get("next");
    const code = p.get("code");
    // `next` used by invite flow, `redirect` used by gift flow
    const target = next ?? redirect;
    // Only allow relative paths, prevent open redirect to external sites
    if (isSafeRelativePath(target)) {
      return code ? `${target}?code=${code}` : target;
    }
    return "/dashboard";
  };

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleSignup = async () => {
    // ── Client-side validation (tous les champs, même non touchés) ─────────
    let firstErrorRef: React.RefObject<HTMLInputElement | null> | null = null;

    let newEmailError = "";
    if (!email.trim()) {
      newEmailError = isFR ? "L'adresse email est requise." : "Email is required.";
    } else if (!EMAIL_REGEX.test(email)) {
      newEmailError = isFR ? "L'adresse email n'est pas valide." : "The email address is not valid.";
    }

    let newPasswordError = "";
    if (!password) {
      newPasswordError = isFR ? "Le mot de passe est requis." : "Password is required.";
    } else if (password.length < 8) {
      newPasswordError = isFR
        ? "Le mot de passe doit contenir au moins 8 caractères."
        : "Password must be at least 8 characters.";
    }

    setEmailError(newEmailError);
    setPasswordError(newPasswordError);

    if (password && confirmPassword && password !== confirmPassword) {
      setPasswordError(isFR ? "Les mots de passe ne correspondent pas." : "Passwords don't match.");
      passwordRef.current?.focus();
      return;
    }

    if (newEmailError) firstErrorRef = emailRef;
    else if (newPasswordError) firstErrorRef = passwordRef;

    if (firstErrorRef) {
      firstErrorRef.current?.focus();
      return;
    }

    if (!agreeToTerms) {
      setTermsError(true);
      return;
    }

    // ── Supabase call ─────────────────────────────────────────────────────
    setStatus("loading");
    setError("");
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: (() => {
          const target = getRedirectTarget();
          return target !== "/dashboard"
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`
            : `${window.location.origin}/auth/callback`;
        })(),
        data: { language: isFR ? "fr" : "en" },
      },
    });
    if (signupError) {
      // Log full error details for debugging (gated by DEBUG_LOGS via lib/log)
      log.error("[signup] Supabase error:", {
        message: signupError.message,
        status: (signupError as { status?: number }).status,
        name: signupError.name,
      });
      setError(getSignupError(signupError.message, isFR));
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  const handleGoogle = async () => {
    const target = getRedirectTarget();
    const callbackUrl =
      target === "/dashboard"
        ? `${window.location.origin}/auth/callback`
        : `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  };

  if (status === "success") {
    const giftCode =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("code")
        : null;
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🐾</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.75rem", color: "#3D2B1F", marginBottom: ".75rem" }}>
              {isFR ? "Vérifiez votre boîte mail" : "Check your inbox"}
            </h2>
            <p style={{ color: "#7A5C44", fontWeight: 300, lineHeight: 1.6 }}>
              {isFR ? (
                <>Nous avons envoyé un lien de confirmation à <strong>{email}</strong>. Cliquez dessus pour activer votre compte.</>
              ) : (
                <>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</>
              )}
            </p>
            {giftCode && (
              <p style={{ marginTop: "1rem", fontSize: ".875rem", color: "#C8813A", fontWeight: 500 }}>
                {isFR ? (
                  <>Votre code cadeau <strong>{giftCode}</strong> sera disponible dès votre connexion.</>
                ) : (
                  <>Your gift code <strong>{giftCode}</strong> will be ready once you sign in.</>
                )}
              </p>
            )}
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const valueBullet3 = selectedPlan === "print_annual" ? t.signup.value_bullet_3_print : t.signup.value_bullet_3;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: isDesktop ? 860 : 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
            Everypaw
          </Link>
          <p style={{ marginTop: ".5rem", fontSize: ".9rem", color: "#7A5C44", fontWeight: 300 }}>
            {isFR ? "Commencez l'histoire de votre animal aujourd'hui" : "Start your pet's story today"}
          </p>
        </div>
      <div style={isDesktop ? { display: "flex", gap: "2rem", alignItems: "flex-start" } : {}}>
      <div style={{ flex: 1, minWidth: 0, maxWidth: isDesktop ? undefined : 420 }}>

        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", boxShadow: "0 4px 40px rgba(61,43,31,.06)" }}>
          {planInfo && (
            <div style={{ background: "#FFF3E0", border: "1px solid #F7C27A", borderRadius: 14, padding: "12px 16px", marginBottom: "1.25rem" }}>
              <p style={{ margin: 0, fontSize: ".875rem", color: "#3D2B1F", fontWeight: 600, lineHeight: 1.4 }}>
                🐾 {isFR ? "Plan sélectionné" : "Selected plan"} : {planInfo.name}, {planInfo.price}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.4 }}>
                {planInfo.perks}
              </p>
            </div>
          )}

          {!isDesktop && (
            <p style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, textAlign: "center", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {t.signup.reassurance_mobile}
            </p>
          )}

          <button onClick={handleGoogle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: ".75rem", padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", cursor: "pointer", marginBottom: "1.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
            {isFR ? "Continuer avec Google" : "Continue with Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(61,43,31,.1)" }} />
            <span style={{ fontSize: ".75rem", color: "#7A5C44" }}>{isFR ? "ou" : "or"}</span>
            <div style={{ flex: 1, height: 1, background: "rgba(61,43,31,.1)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
              <input
                ref={emailRef}
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError && EMAIL_REGEX.test(e.target.value)) setEmailError("");
                }}
                onBlur={() => {
                  if (!email.trim())
                    setEmailError(isFR ? "L'adresse email est requise." : "Email is required.");
                  else if (!EMAIL_REGEX.test(email))
                    setEmailError(isFR ? "L'adresse email n'est pas valide." : "The email address is not valid.");
                }}
                style={{
                  padding: ".75rem 1rem", borderRadius: 12,
                  border: `1.5px solid ${emailError ? "#FCA5A5" : "rgba(61,43,31,.15)"}`,
                  background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none",
                }}
              />
              {emailError && (
                <p style={{ fontSize: ".78rem", color: "#991B1B", margin: "0 0 0 .25rem" }}>{emailError}</p>
              )}
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
              <div style={{ position: "relative" }}>
                <input
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  placeholder={isFR ? "Mot de passe (min. 8 caractères)" : "Password (min. 8 characters)"}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (passwordError && e.target.value.length >= 8) setPasswordError("");
                  }}
                  onBlur={() => {
                    if (!password)
                      setPasswordError(isFR ? "Le mot de passe est requis." : "Password is required.");
                    else if (password.length < 8)
                      setPasswordError(isFR ? "Le mot de passe doit contenir au moins 8 caractères." : "Password must be at least 8 characters.");
                  }}
                  onKeyDown={e => e.key === "Enter" && handleSignup()}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: ".75rem 2.75rem .75rem 1rem", borderRadius: 12,
                    border: `1.5px solid ${passwordError ? "#FCA5A5" : "rgba(61,43,31,.15)"}`,
                    background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: ".75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9A8070", padding: 0, display: "flex", alignItems: "center" }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <PasswordStrength password={password} isFR={isFR} />
              {passwordError && (
                <p style={{ fontSize: ".78rem", color: "#991B1B", margin: "0 0 0 .25rem" }}>{passwordError}</p>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={isFR ? "Confirmer le mot de passe" : "Confirm password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSignup()}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: ".75rem 2.75rem .75rem 1rem", borderRadius: 12,
                    border: "1.5px solid rgba(61,43,31,.15)",
                    background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{ position: "absolute", right: ".75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9A8070", padding: 0, display: "flex", alignItems: "center" }}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* CGU checkbox */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: ".625rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={e => { setAgreeToTerms(e.target.checked); if (e.target.checked) setTermsError(false); }}
                style={{ marginTop: "3px", flexShrink: 0, accentColor: "#C8813A", width: 15, height: 15, cursor: "pointer" }}
              />
              <span style={{ fontSize: ".78rem", color: "#7A5C44", lineHeight: 1.55, fontWeight: 300 }}>
                {isFR ? (
                  <>En créant un compte, j'accepte les{" "}
                    <Link href="/legal/cgv" target="_blank" style={{ color: "#C8813A", textDecoration: "underline" }}>Conditions générales de vente</Link>
                    {" "}et la{" "}
                    <Link href="/legal/confidentialite" target="_blank" style={{ color: "#C8813A", textDecoration: "underline" }}>Politique de confidentialité</Link>.
                  </>
                ) : (
                  <>By creating an account, I agree to the{" "}
                    <Link href="/legal/terms" target="_blank" style={{ color: "#C8813A", textDecoration: "underline" }}>Terms of sale</Link>
                    {" "}and{" "}
                    <Link href="/legal/privacy" target="_blank" style={{ color: "#C8813A", textDecoration: "underline" }}>Privacy policy</Link>.
                  </>
                )}
              </span>
            </label>
            {termsError && (
              <p style={{ fontSize: ".78rem", color: "#991B1B", margin: "-.25rem 0 0 1.625rem" }}>
                {isFR ? "Veuillez accepter les conditions pour continuer." : "Please accept the terms to continue."}
              </p>
            )}

            {/* General Supabase error */}
            {error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: ".8rem", color: "#991B1B", margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={status === "loading"}
              style={{ padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? .5 : 1, transition: "opacity .15s", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {status === "loading"
                ? (isFR ? "Création du compte…" : "Creating account…")
                : (isFR ? "Créer un compte" : "Create account")}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: ".85rem", color: "#7A5C44" }}>
          {isFR ? "Vous avez déjà un compte ?" : "Already have an account?"}{" "}
          <Link href="/auth/login" style={{ color: "#C8813A", fontWeight: 500, textDecoration: "none" }}>
            {isFR ? "Se connecter" : "Sign in"}
          </Link>
        </p>
        <p style={{ textAlign: "center", marginTop: ".5rem", fontSize: ".8rem" }}>
          <Link href="/" style={{ color: "#9A8070", fontWeight: 400, textDecoration: "none" }}>
            {isFR ? "Retour à l'accueil" : "Back to home"}
          </Link>
        </p>
      </div>

      {isDesktop && (
        <div style={{ flex: "0 0 300px", background: "#EDE5D4", borderRadius: 16, padding: "32px", alignSelf: "flex-start" }}>
          <div style={{ fontSize: 80, marginBottom: "1.25rem", lineHeight: 1 }}>📖</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1.25rem", lineHeight: 1.3 }}>
            {t.signup.value_title}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {[t.signup.value_bullet_1, t.signup.value_bullet_2, valueBullet3].map(bullet => (
              <p key={bullet} style={{ fontSize: ".875rem", color: "#3D2B1F", margin: 0, fontWeight: 400, lineHeight: 1.5 }}>
                {bullet}
              </p>
            ))}
          </div>
        </div>
      )}

      </div>
      </div>
      </div>
      <PublicFooter />
    </div>
  );
}
