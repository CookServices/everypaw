"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";
import { useRouter } from "next/navigation";
import { formatPrice, type Currency } from "@/lib/currency";

export const dynamic = "force-dynamic";


type Plan = "free" | "digital" | "print";

interface SubscriptionInfo {
  status: string;
  cancel_at_period_end: boolean;
  cancel_at: number | null;
  current_period_end: number;
}

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const isFR = locale === "fr";
  const router = useRouter();

  // ── Preferences state ────────────────────────────────────────────────────────
  const [emailReminders, setEmailReminders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"success" | "error" | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  // ── Security state ───────────────────────────────────────────────────────────
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Subscription state ───────────────────────────────────────────────────────
  const [plan, setPlan] = useState<Plan>("free");
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null); // plan being upgraded to
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelledAt, setCancelledAt] = useState<number | null>(null);
  const [profileRenewalDate, setProfileRenewalDate] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // ── Currency ─────────────────────────────────────────────────────────────────
  const [currency, setCurrency] = useState<Currency>("USD");

  // ── Delete account state ─────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: profileData }, { data: { user } }] = await Promise.all([
        supabase.from("profiles").select("email_reminders, subscription_renewal_date").single(),
        supabase.auth.getUser(),
      ]);
      if (profileData) {
        setEmailReminders(profileData.email_reminders ?? true);
        if (profileData.subscription_renewal_date) setProfileRenewalDate(profileData.subscription_renewal_date);
      }
      if (user?.email) setCurrentEmail(user.email);
      if (user?.app_metadata?.provider === "google") setIsGoogleAccount(true);
      setLoading(false);
    };
    load();
    fetch("/api/currency").then(r => r.json()).then(d => setCurrency(d.currency as Currency)).catch(() => {});

    // Load subscription info separately
    const loadSub = async () => {
      setSubLoading(true);
      try {
        const res = await fetch("/api/stripe/subscription");
        if (res.ok) {
          const data = await res.json();
          setPlan(data.plan ?? "free");
          setSubscription(data.subscription ?? null);
          if (data.subscription?.cancel_at_period_end && data.subscription?.cancel_at) {
            setCancelledAt(data.subscription.cancel_at);
          }
        }
      } catch {}
      setSubLoading(false);
    };
    loadSub();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToastMsg(msg);
    setSaveResult(type);
    setTimeout(() => { setSaveResult(null); setToastMsg(""); }, 3000);
  };

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString(isFR ? "fr-FR" : "en-US", {
      day: "numeric", month: "long", year: "numeric",
    });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ email_reminders: emailReminders })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);
    setSaving(false);
    showToast(error ? t.settings.save_error : t.settings.save_success, error ? "error" : "success");
  };

  const handleEmailChange = async () => {
    setEmailError("");
    if (!newEmail.trim()) { setEmailError(isFR ? "Entrez un email valide." : "Enter a valid email."); return; }
    setEmailStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { setEmailError(error.message); setEmailStatus("error"); }
    else {
      setEmailStatus("done");
      setNewEmail("");
      showToast(isFR ? "Email mis à jour. Vérifiez votre nouvelle boîte mail." : "Email updated. Check your new inbox.", "success");
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError(isFR ? "Entrez votre mot de passe actuel." : "Enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError(isFR ? "Le mot de passe doit faire au moins 8 caractères." : "Password must be at least 8 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(isFR ? "Le nouveau mot de passe doit être différent de l'ancien." : "The new password must be different from the current one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(isFR ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
      return;
    }
    setPasswordStatus("saving");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: currentEmail, password: currentPassword });
    if (verifyError) {
      setPasswordError(isFR ? "Mot de passe actuel incorrect." : "Current password is incorrect.");
      setPasswordStatus("error");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = error.message;
      const translated = isFR && msg.toLowerCase().includes("new password should be different")
        ? "Le nouveau mot de passe doit être différent de l'ancien."
        : msg;
      setPasswordError(translated);
      setPasswordStatus("error");
    } else {
      setPasswordStatus("done");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      showToast(isFR ? "Mot de passe mis à jour." : "Password updated.", "success");
    }
  };

  const handleCheckout = async (targetPlan: "digital" | "print") => {
    setCheckoutLoading(targetPlan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast(data.error ?? (isFR ? "Erreur lors de la redirection." : "Redirect error."), "error");
    } catch {
      showToast(isFR ? "Erreur réseau." : "Network error.", "error");
    }
    setCheckoutLoading(null);
  };

  const handleUpgrade = async (newPlan: string) => {
    setUpgradeLoading(newPlan);
    try {
      const res = await fetch("/api/stripe/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlan }),
      });
      const data = await res.json();
      if (data.success) {
        setPlan(data.plan);
        showToast(isFR ? "Plan mis à jour avec succès." : "Plan updated successfully.", "success");
      } else {
        showToast(data.error ?? (isFR ? "Erreur lors du changement de plan." : "Plan change failed."), "error");
      }
    } catch {
      showToast(isFR ? "Erreur réseau." : "Network error.", "error");
    }
    setUpgradeLoading(null);
  };

  const handleCancel = async () => {
    const confirmed = window.confirm(
      isFR
        ? "Êtes-vous sûr ? Vous perdrez accès aux fonctionnalités Premium à la fin de la période en cours."
        : "Are you sure? You will lose access to Premium features at the end of the current billing period."
    );
    if (!confirmed) return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCancelledAt(data.cancel_at ?? data.current_period_end);
        setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true, cancel_at: data.cancel_at } : null);
        showToast(
          isFR
            ? `Abonnement annulé. Accès conservé jusqu'au ${formatDate(data.cancel_at ?? data.current_period_end)}.`
            : `Subscription cancelled. Access until ${formatDate(data.cancel_at ?? data.current_period_end)}.`,
          "success"
        );
      } else {
        showToast(data.error ?? (isFR ? "Erreur lors de l'annulation." : "Cancellation failed."), "error");
      }
    } catch {
      showToast(isFR ? "Erreur réseau." : "Network error.", "error");
    }
    setCancelLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== (isFR ? "SUPPRIMER" : "DELETE")) {
      setDeleteError(isFR ? "Tapez SUPPRIMER pour confirmer." : "Type DELETE to confirm.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
      } else {
        setDeleteError(data.error ?? (isFR ? "Erreur lors de la suppression." : "Deletion failed."));
        setDeleteLoading(false);
      }
    } catch {
      setDeleteError(isFR ? "Erreur réseau." : "Network error.");
      setDeleteLoading(false);
    }
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: ".65rem .875rem", borderRadius: 10,
    border: "1.5px solid rgba(61,43,31,.15)",
    background: "#F7F2EA", fontFamily: "inherit",
    fontSize: ".875rem", color: "#3D2B1F", outline: "none",
  };

  const btnPrimary: React.CSSProperties = {
    padding: ".65rem 1.25rem", borderRadius: 100, border: "none",
    background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit",
    fontSize: ".875rem", fontWeight: 500, cursor: "pointer",
  };

  const btnOutline: React.CSSProperties = {
    padding: ".6rem 1rem", borderRadius: 100,
    border: "1.5px solid rgba(200,129,58,.4)", background: "transparent",
    color: "#C8813A", fontFamily: "inherit", fontSize: ".875rem",
    fontWeight: 500, cursor: "pointer", alignSelf: "flex-start" as const,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Toast */}
      {saveResult && (
        <div className="ep-toast" style={{ background: saveResult === "success" ? "#2E5E1E" : "#A32D2D", color: "#FDFAF5", padding: ".875rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>
          {toastMsg || (saveResult === "success" ? t.settings.save_success : t.settings.save_error)}
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "1rem" }}>
          <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "2rem", maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "#A32D2D", margin: "0 0 1rem" }}>
              {isFR ? "Supprimer mon compte" : "Delete my account"}
            </h3>
            <p style={{ fontSize: ".875rem", color: "#3D2B1F", lineHeight: 1.6, margin: "0 0 1.25rem" }}>
              {isFR
                ? "Cette action est irréversible. Toutes vos données seront supprimées : profil, animaux, entrées, histoires, photos."
                : "This action is irreversible. All your data will be deleted: profile, pets, entries, stories, photos."}
            </p>
            <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: "0 0 .5rem" }}>
              {isFR ? 'Tapez "SUPPRIMER" pour confirmer' : 'Type "DELETE" to confirm'}
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={isFR ? "SUPPRIMER" : "DELETE"}
              style={{ ...inputStyle, marginBottom: ".75rem" }}
            />
            {deleteError && (
              <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: "0 0 .75rem" }}>{deleteError}</p>
            )}
            <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); setDeleteError(""); }}
                style={{ ...btnOutline, border: "1.5px solid rgba(61,43,31,.2)", color: "#3D2B1F" }}
              >
                {isFR ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{ ...btnPrimary, background: "#A32D2D", opacity: deleteLoading ? .7 : 1 }}
              >
                {deleteLoading
                  ? (isFR ? "Suppression…" : "Deleting…")
                  : (isFR ? "Supprimer définitivement" : "Delete permanently")}
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* ── Subscription section ─────────────────────────────────────────── */}
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", marginBottom: "1.25rem" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1.25rem" }}>
            {isFR ? "Mon abonnement" : "My subscription"}
          </h2>

          {subLoading ? (
            <p style={{ color: "#9A8070", fontSize: ".875rem" }}>…</p>
          ) : (
            <>
              {/* Current plan badge */}
              <div style={{ display: "flex", alignItems: "center", gap: ".625rem", marginBottom: "1.25rem" }}>
                <span style={{ display: "inline-block", padding: ".3rem .875rem", borderRadius: 100, background: plan === "free" ? "rgba(61,43,31,.08)" : "rgba(200,129,58,.12)", border: `1px solid ${plan === "free" ? "rgba(61,43,31,.15)" : "rgba(200,129,58,.3)"}`, fontSize: ".8rem", fontWeight: 600, color: plan === "free" ? "#7A5C44" : "#C8813A" }}>
                  {plan === "free"
                    ? (isFR ? "Plan gratuit" : "Free plan")
                    : plan === "digital"
                      ? "Premium Digital"
                      : "Premium Print"}
                </span>
                {plan !== "free" && (
                  <span style={{ fontSize: ".8rem", color: "#9A8070" }}>
                    {`${formatPrice(currency, plan === "digital" ? "digital" : "print")}/${isFR ? "mois" : "mo"}`}
                  </span>
                )}
              </div>

              {/* Renewal date */}
              {plan !== "free" && !cancelledAt && (subscription?.current_period_end || profileRenewalDate) && (
                <p style={{ fontSize: ".8rem", color: "#9A8070", margin: "-0.5rem 0 1.25rem", fontWeight: 300 }}>
                  {isFR
                    ? `Prochain renouvellement : ${formatDate((subscription?.current_period_end ?? profileRenewalDate)!)}`
                    : `Next renewal: ${formatDate((subscription?.current_period_end ?? profileRenewalDate)!)}`}
                </p>
              )}

              {/* Cancellation notice */}
              {cancelledAt && (
                <div style={{ background: "rgba(163,45,45,.05)", border: "1px solid rgba(163,45,45,.2)", borderRadius: 10, padding: ".75rem 1rem", marginBottom: "1.25rem" }}>
                  <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: 0 }}>
                    {isFR
                      ? `Votre abonnement sera annulé le ${formatDate(cancelledAt)}. Vous gardez l'accès jusqu'à cette date.`
                      : `Your subscription will be cancelled on ${formatDate(cancelledAt)}. You keep access until then.`}
                  </p>
                </div>
              )}

              {/* Plan = free → upgrade CTAs */}
              {plan === "free" && (
                <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                  <p style={{ fontSize: ".875rem", color: "#7A5C44", margin: "0 0 .5rem", fontWeight: 300 }}>
                    {isFR ? "Passez à Premium pour débloquer toutes les fonctionnalités." : "Upgrade to Premium to unlock all features."}
                  </p>
                  <button
                    onClick={() => handleCheckout("digital")}
                    disabled={checkoutLoading === "digital"}
                    style={{ ...btnPrimary, opacity: checkoutLoading === "digital" ? .7 : 1 }}
                  >
                    {checkoutLoading === "digital"
                      ? "…"
                      : (isFR ? `Passer à Premium Digital — ${formatPrice(currency, "digital")}/mois →` : `Upgrade to Premium Digital — ${formatPrice(currency, "digital")}/mo →`)}
                  </button>
                  <button
                    onClick={() => handleCheckout("print")}
                    disabled={checkoutLoading === "print"}
                    style={{ ...btnPrimary, background: "#3D2B1F", opacity: checkoutLoading === "print" ? .7 : 1 }}
                  >
                    {checkoutLoading === "print"
                      ? "…"
                      : (isFR ? `Passer à Premium Print — ${formatPrice(currency, "print")}/mois →` : `Upgrade to Premium Print — ${formatPrice(currency, "print")}/mo →`)}
                  </button>
                  <p style={{ fontSize: ".72rem", color: "#9A8070", margin: ".25rem 0 0", lineHeight: 1.5, fontWeight: 300, textAlign: "center" as const }}>
                    {isFR ? (
                      <>En continuant, vous acceptez les <a href="/legal/cgv" target="_blank" style={{ color: "#9A8070", textDecoration: "underline" }}>CGV</a>.</>
                    ) : (
                      <>By continuing, you agree to our <a href="/legal/cgv" target="_blank" style={{ color: "#9A8070", textDecoration: "underline" }}>Terms of Service</a>.</>
                    )}
                  </p>
                </div>
              )}

              {/* Plan = digital */}
              {plan === "digital" && !cancelledAt && (
                <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                  <button
                    onClick={() => handleUpgrade("print")}
                    disabled={!!upgradeLoading}
                    style={{ ...btnOutline, alignSelf: "stretch", textAlign: "center" as const, opacity: upgradeLoading ? .7 : 1 }}
                  >
                    {upgradeLoading
                      ? (isFR ? "Mise à jour…" : "Updating…")
                      : (isFR ? `Passer à Premium Print — ${formatPrice(currency, "print")}/mois →` : `Upgrade to Premium Print — ${formatPrice(currency, "print")}/mo →`)}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#A32D2D", fontSize: ".8rem", fontFamily: "inherit", padding: ".25rem 0", textDecoration: "underline", opacity: cancelLoading ? .6 : 1, textAlign: "left" as const }}
                  >
                    {cancelLoading
                      ? (isFR ? "Annulation…" : "Cancelling…")
                      : (isFR ? "Annuler mon abonnement" : "Cancel my subscription")}
                  </button>
                </div>
              )}

              {/* Plan = print */}
              {plan === "print" && !cancelledAt && (
                <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                  <button
                    onClick={() => handleUpgrade("digital")}
                    disabled={!!upgradeLoading}
                    style={{ ...btnOutline, alignSelf: "stretch", textAlign: "center" as const, opacity: upgradeLoading ? .7 : 1 }}
                  >
                    {upgradeLoading
                      ? (isFR ? "Mise à jour…" : "Updating…")
                      : (isFR ? `Passer à Premium Digital — ${formatPrice(currency, "digital")}/mois →` : `Switch to Premium Digital — ${formatPrice(currency, "digital")}/mo →`)}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#A32D2D", fontSize: ".8rem", fontFamily: "inherit", padding: ".25rem 0", textDecoration: "underline", opacity: cancelLoading ? .6 : 1, textAlign: "left" as const }}
                  >
                    {cancelLoading
                      ? (isFR ? "Annulation…" : "Cancelling…")
                      : (isFR ? "Annuler mon abonnement" : "Cancel my subscription")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Preferences section ──────────────────────────────────────────── */}
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", marginBottom: "1.25rem" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1.5rem" }}>{t.settings.title}</h2>

          {loading ? (
            <p style={{ color: "#7A5C44", fontSize: ".9rem" }}>{t.dashboard.loading_btn}</p>
          ) : (
            <>
              <div style={{ padding: "1rem 0", borderBottom: "0.5px solid rgba(61,43,31,.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .25rem" }}>{t.settings.weekly_reminders}</p>
                    <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>{t.settings.weekly_reminders_desc}</p>
                  </div>
                  <button onClick={() => setEmailReminders(!emailReminders)} style={{ width: 44, height: 24, borderRadius: 100, background: emailReminders ? "#C8813A" : "rgba(61,43,31,.15)", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0, marginLeft: "1rem" }}>
                    <span style={{ position: "absolute", top: 2, left: emailReminders ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#FDFAF5", transition: "left .2s", display: "block" }} />
                  </button>
                </div>
                {emailReminders && (
                  <p style={{ fontSize: ".75rem", color: "#C8813A", margin: ".6rem 0 0", fontWeight: 300, fontStyle: "italic" }}>{t.settings.weekly_reminders_info}</p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0" }}>
                <div>
                  <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .25rem" }}>{t.settings.onboarding_guide}</p>
                  <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>{t.settings.onboarding_guide_desc}</p>
                </div>
                <button onClick={async () => { const s = createClient(); const { data: { user } } = await s.auth.getUser(); await s.from("profiles").update({ onboarding_completed: false }).eq("id", user!.id); showToast(t.settings.save_success, "success"); }} style={{ background: "transparent", color: "#C8813A", padding: ".4rem 1rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500, border: "1.5px solid rgba(200,129,58,.3)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", marginLeft: "1rem" }}>
                  {t.settings.reset_guide}
                </button>
              </div>

              <button onClick={handleSave} disabled={saving} style={{ marginTop: ".5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: saving ? .7 : 1 }}>
                {saving ? t.settings.saving : t.settings.save}
              </button>
            </>
          )}
        </div>

        {/* ── Account security section ─────────────────────────────────────── */}
        {!loading && (
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", marginBottom: "1.25rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1.5rem" }}>
              {isFR ? "Sécurité du compte" : "Account security"}
            </h2>

            {/* Changer l'email */}
            <div style={{ paddingBottom: "1.5rem", borderBottom: isGoogleAccount ? "none" : "0.5px solid rgba(61,43,31,.08)", marginBottom: isGoogleAccount ? 0 : "1.5rem" }}>
              <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .75rem" }}>
                {isFR ? "Changer l'adresse email" : "Change email address"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                {currentEmail && (
                  <p style={{ fontSize: ".85rem", color: "#9A8070", margin: "0 0 4px" }}>
                    {isFR ? `Adresse actuelle : ${currentEmail}` : `Current address: ${currentEmail}`}
                  </p>
                )}
                <input
                  type="email"
                  placeholder={isFR ? "Nouvelle adresse email" : "New email address"}
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={inputStyle}
                />
                {emailError && <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: 0 }}>{emailError}</p>}
                <button onClick={handleEmailChange} disabled={emailStatus === "saving"} style={{ ...btnOutline, opacity: emailStatus === "saving" ? .7 : 1 }}>
                  {emailStatus === "saving" ? (isFR ? "Mise à jour…" : "Updating…") : (isFR ? "Mettre à jour l'email →" : "Update email →")}
                </button>
              </div>
            </div>

            {/* Changer le mot de passe */}
            {!isGoogleAccount && (
              <div>
                <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .75rem" }}>
                  {isFR ? "Changer le mot de passe" : "Change password"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                  <input type="password" placeholder={isFR ? "Mot de passe actuel" : "Current password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} />
                  <input type="password" placeholder={isFR ? "Nouveau mot de passe" : "New password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
                  <input type="password" placeholder={isFR ? "Confirmer le mot de passe" : "Confirm password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
                  {passwordError && <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: 0 }}>{passwordError}</p>}
                  <button onClick={handlePasswordChange} disabled={passwordStatus === "saving"} style={{ ...btnOutline, opacity: passwordStatus === "saving" ? .7 : 1 }}>
                    {passwordStatus === "saving" ? (isFR ? "Mise à jour…" : "Updating…") : (isFR ? "Mettre à jour le mot de passe →" : "Update password →")}
                  </button>
                </div>
              </div>
            )}

            {isGoogleAccount && (
              <p style={{ fontSize: ".8rem", color: "#9A8070", fontWeight: 300, fontStyle: "italic", margin: 0 }}>
                {isFR ? "Votre compte est connecté via Google. La gestion du mot de passe se fait depuis votre compte Google." : "Your account is linked via Google. Manage your password from your Google account."}
              </p>
            )}
          </div>
        )}

        {/* ── Danger zone — delete account ─────────────────────────────────── */}
        {!loading && (
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(163,45,45,.15)", marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#A32D2D", marginBottom: ".5rem" }}>
              {isFR ? "Zone dangereuse" : "Danger zone"}
            </h2>
            <p style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, margin: "0 0 1.25rem" }}>
              {isFR
                ? "Ces actions sont irréversibles. Procédez avec précaution."
                : "These actions are irreversible. Proceed with caution."}
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{ background: "none", border: "1.5px solid #A32D2D", borderRadius: 100, cursor: "pointer", color: "#A32D2D", fontSize: ".875rem", fontFamily: "inherit", padding: ".6rem 1.25rem", fontWeight: 500 }}
            >
              {isFR ? "Supprimer mon compte et toutes mes données" : "Delete my account and all my data"}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
