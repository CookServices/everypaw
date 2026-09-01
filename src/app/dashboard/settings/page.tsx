"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";
import { useRouter } from "next/navigation";
import { type Currency } from "@/lib/currency";
import { fmtDateOrdinal } from "@/lib/date";
import type { Plan, SubscriptionInfo, Invoice } from "./constants";
import UpgradeConfirmModal from "./components/UpgradeConfirmModal";
import DeleteAccountModal from "./components/DeleteAccountModal";
import SubscriptionSection from "./components/SubscriptionSection";
import InvoicesSection from "./components/InvoicesSection";
import PreferencesSection from "./components/PreferencesSection";
import AccountSecuritySection from "./components/AccountSecuritySection";
import DataExportSection from "./components/DataExportSection";
import DangerZoneSection from "./components/DangerZoneSection";

export const dynamic = "force-dynamic";

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
  const [settingsBilling, setSettingsBilling] = useState<"monthly" | "annual">("monthly");
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null); // plan being upgraded to
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [cancelledAt, setCancelledAt] = useState<number | null>(null);
  const [profileRenewalDate, setProfileRenewalDate] = useState<number | null>(null);
  const [bookCredits, setBookCredits] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // ── Gift code state ──────────────────────────────────────────────────────────
  const [giftCode, setGiftCode] = useState("");
  const [giftStatus, setGiftStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [giftError, setGiftError] = useState("");
  const [giftResult, setGiftResult] = useState<{ activatesAt?: number; plan?: string } | null>(null);

  // ── Currency ─────────────────────────────────────────────────────────────────
  const [currency, setCurrency] = useState<Currency>("USD");

  // ── Delete account state ─────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ── RGPD export state ────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState(false);
  const [exportHtmlLoading, setExportHtmlLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesVisible, setInvoicesVisible] = useState(3);

  // ── Upgrade confirmation modal ────────────────────────────────────────────────
  const [upgradeModal, setUpgradeModal] = useState<{
    newPlan: string;
    scheduledDate: number;
  } | null>(null);
  const [upgradePreviewLoading, setUpgradePreviewLoading] = useState<string | null>(null);

  // /auth/confirm bounced back here after a failed server-side email_change
  // token verification (invalid, expired, or already-used confirmation link).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("auth_error") === "confirm_failed") {
      setEmailStatus("error");
      setEmailError(isFR
        ? "Ce lien de confirmation n'est plus valide. Réessayez de changer d'adresse email."
        : "This confirmation link is no longer valid. Try changing your email address again.");
    }
  }, [isFR]);

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: profileData }, { data: { user } }] = await Promise.all([
        supabase.from("profiles").select("email_reminders, subscription_renewal_date, book_credits").single(),
        supabase.auth.getUser(),
      ]);
      if (profileData) {
        setEmailReminders(profileData.email_reminders ?? true);
        if (profileData.subscription_renewal_date) setProfileRenewalDate(profileData.subscription_renewal_date);
        setBookCredits(profileData.book_credits ?? 0);
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

    // Load invoices
    const loadInvoices = async () => {
      setInvoicesLoading(true);
      try {
        const res = await fetch("/api/stripe/invoices");
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.invoices ?? []);
        }
      } catch {}
      setInvoicesLoading(false);
    };
    loadInvoices();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error") => {
    setToastMsg(msg);
    setSaveResult(type);
    setTimeout(() => { setSaveResult(null); setToastMsg(""); }, 3000);
  };

  const formatDate = (ts: number) =>
    fmtDateOrdinal(new Date(ts * 1000), isFR, { month: "long", year: "numeric" });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleToggleReminders = async (newValue: boolean) => {
    setEmailReminders(newValue);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ email_reminders: newValue }).eq("id", user!.id);
    if (error) {
      setEmailReminders(!newValue);
      showToast(t.settings.save_error, "error");
    }
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

  const handleCheckout = async (targetPlan: "digital" | "print_annual") => {
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

  const handleRedeemGift = async () => {
    const trimmed = giftCode.trim().toUpperCase();
    if (!trimmed) {
      setGiftError(isFR ? "Entrez votre code cadeau." : "Enter your gift code.");
      return;
    }
    setGiftStatus("loading");
    setGiftError("");
    try {
      const res = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.scheduled) {
        setGiftResult({ activatesAt: data.activatesAt, plan: data.plan });
        setGiftStatus("success");
        setGiftCode("");
      } else {
        const msg = data.error ?? (isFR ? "Code invalide." : "Invalid code.");
        const translated = msg === "This gift code is not for your account"
          ? (isFR ? "Ce code cadeau n'est pas destiné à votre compte." : "This gift code is not for your account.")
          : msg === "Invalid or already used code"
            ? (isFR ? "Code invalide ou déjà utilisé." : "Invalid or already used code.")
            : msg;
        setGiftError(translated);
        setGiftStatus("error");
      }
    } catch {
      setGiftError(isFR ? "Erreur réseau." : "Network error.");
      setGiftStatus("error");
    }
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
        setUpgradeModal(null);
        const dateStr = data.scheduledAt ? formatDate(data.scheduledAt) : "";
        showToast(
          isFR
            ? `Changement planifié${dateStr ? ` pour le ${dateStr}` : ""}.`
            : `Change scheduled${dateStr ? ` for ${dateStr}` : ""}.`,
          "success"
        );
      } else {
        showToast(data.error ?? (isFR ? "Erreur lors du changement de plan." : "Plan change failed."), "error");
      }
    } catch {
      showToast(isFR ? "Erreur réseau." : "Network error.", "error");
    }
    setUpgradeLoading(null);
  };

  const handleUpgradeWithPreview = async (newPlan: string) => {
    setUpgradePreviewLoading(newPlan);
    try {
      const res = await fetch(`/api/stripe/upgrade-preview?newPlan=${encodeURIComponent(newPlan)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error ?? (isFR ? "Impossible de récupérer la date." : "Could not fetch scheduled date."), "error");
      } else {
        setUpgradeModal({ newPlan, scheduledDate: data.scheduledDate });
      }
    } catch {
      showToast(isFR ? "Erreur réseau." : "Network error.", "error");
    }
    setUpgradePreviewLoading(null);
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

  const handleReactivate = async () => {
    setReactivateLoading(true);
    try {
      const res = await fetch("/api/stripe/reactivate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCancelledAt(null);
        setSubscription(prev => prev ? { ...prev, cancel_at_period_end: false, cancel_at: null } : null);
        showToast(
          isFR ? "Abonnement réactivé avec succès." : "Subscription reactivated successfully.",
          "success"
        );
      } else {
        showToast(data.error ?? (isFR ? "Erreur lors de la réactivation." : "Reactivation failed."), "error");
      }
    } catch {
      showToast(isFR ? "Erreur réseau." : "Network error.", "error");
    }
    setReactivateLoading(false);
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

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/export-data");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `everypaw-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(isFR ? "Erreur lors de l'export. Réessayez." : "Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportHtml = async () => {
    setExportHtmlLoading(true);
    try {
      const res = await fetch("/api/export-data?format=html");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `everypaw-donnees-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(isFR ? "Erreur lors de l'export. Réessayez." : "Export failed. Please try again.");
    } finally {
      setExportHtmlLoading(false);
    }
  };

  const handleResetOnboarding = async () => {
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    await s.from("profiles").update({ onboarding_dismissed: false }).eq("id", user!.id);
    ["ep_cm_first_entry", "ep_cm_first_story", "ep_cm_book_credit"].forEach(k => localStorage.removeItem(k));
    showToast(t.settings.save_success, "success");
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Toast */}
      {saveResult && (
        <div className="ep-toast" style={{ background: saveResult === "success" ? "#2E5E1E" : "#A32D2D", color: "#FDFAF5", padding: ".875rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>
          {toastMsg || (saveResult === "success" ? t.settings.save_success : t.settings.save_error)}
        </div>
      )}

      {/* Upgrade confirmation modal */}
      {upgradeModal && (
        <UpgradeConfirmModal
          newPlan={upgradeModal.newPlan}
          scheduledDate={upgradeModal.scheduledDate}
          isFR={isFR}
          upgradeLoading={upgradeLoading}
          onCancel={() => setUpgradeModal(null)}
          onConfirm={handleUpgrade}
        />
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          isFR={isFR}
          deleteConfirmText={deleteConfirmText}
          deleteError={deleteError}
          deleteLoading={deleteLoading}
          onTextChange={setDeleteConfirmText}
          onCancel={() => { setShowDeleteModal(false); setDeleteConfirmText(""); setDeleteError(""); }}
          onConfirm={handleDeleteAccount}
        />
      )}

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        <SubscriptionSection
          isFR={isFR}
          subLoading={subLoading}
          plan={plan}
          currency={currency}
          cancelledAt={cancelledAt}
          subscription={subscription}
          profileRenewalDate={profileRenewalDate}
          bookCredits={bookCredits}
          formatDate={formatDate}
          reactivateLoading={reactivateLoading}
          handleReactivate={handleReactivate}
          checkoutLoading={checkoutLoading}
          handleCheckout={handleCheckout}
          upgradeLoading={upgradeLoading}
          upgradePreviewLoading={upgradePreviewLoading}
          handleUpgradeWithPreview={handleUpgradeWithPreview}
          cancelLoading={cancelLoading}
          handleCancel={handleCancel}
          giftStatus={giftStatus}
          giftResult={giftResult}
          giftCode={giftCode}
          setGiftCode={setGiftCode}
          setGiftStatus={setGiftStatus}
          setGiftError={setGiftError}
          handleRedeemGift={handleRedeemGift}
          giftError={giftError}
        />

        <InvoicesSection
          isFR={isFR}
          invoicesLoading={invoicesLoading}
          invoices={invoices}
          invoicesVisible={invoicesVisible}
          setInvoicesVisible={setInvoicesVisible}
        />

        <PreferencesSection
          t={t}
          loading={loading}
          emailReminders={emailReminders}
          handleToggleReminders={handleToggleReminders}
          handleResetOnboarding={handleResetOnboarding}
        />

        {!loading && (
          <AccountSecuritySection
            isFR={isFR}
            isGoogleAccount={isGoogleAccount}
            currentEmail={currentEmail}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            emailError={emailError}
            handleEmailChange={handleEmailChange}
            emailStatus={emailStatus}
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            passwordError={passwordError}
            handlePasswordChange={handlePasswordChange}
            passwordStatus={passwordStatus}
          />
        )}

        {!loading && (
          <DataExportSection
            isFR={isFR}
            exportHtmlLoading={exportHtmlLoading}
            handleExportHtml={handleExportHtml}
            exportLoading={exportLoading}
            handleExportData={handleExportData}
          />
        )}

        {!loading && (
          <DangerZoneSection
            isFR={isFR}
            onDeleteClick={() => setShowDeleteModal(true)}
          />
        )}

      </main>
    </div>
  );
}
