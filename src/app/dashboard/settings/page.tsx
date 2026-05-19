"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const isFR = locale === "fr";
  const [emailReminders, setEmailReminders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"success" | "error" | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  // Security
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: profileData }, { data: { user } }] = await Promise.all([
        supabase.from("profiles").select("email_reminders").single(),
        supabase.auth.getUser(),
      ]);
      if (profileData) setEmailReminders(profileData.email_reminders ?? true);
      if (user?.email) setCurrentEmail(user.email);
      if (user?.app_metadata?.provider === "google") setIsGoogleAccount(true);
      setLoading(false);
    };
    load();
  }, []);

  const showToast = (msg: string, type: "success" | "error") => {
    setToastMsg(msg);
    setSaveResult(type);
    setTimeout(() => { setSaveResult(null); setToastMsg(""); }, 3000);
  };

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
    if (!newPassword || newPassword.length < 8) {
      setPasswordError(isFR ? "Le mot de passe doit faire au moins 8 caractères." : "Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(isFR ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
      return;
    }
    setPasswordStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPasswordError(error.message); setPasswordStatus("error"); }
    else {
      setPasswordStatus("done");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      showToast(isFR ? "Mot de passe mis à jour." : "Password updated.", "success");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: ".65rem .875rem", borderRadius: 10,
    border: "1.5px solid rgba(61,43,31,.15)",
    background: "#F7F2EA", fontFamily: "inherit",
    fontSize: ".875rem", color: "#3D2B1F", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      {saveResult && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: saveResult === "success" ? "#2E5E1E" : "#A32D2D", color: "#FDFAF5", padding: ".875rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>
          {toastMsg || (saveResult === "success" ? t.settings.save_success : t.settings.save_error)}
        </div>
      )}

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Préférences */}
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

        {/* Sécurité du compte */}
        {!loading && (
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)" }}>
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
                <button
                  onClick={handleEmailChange}
                  disabled={emailStatus === "saving"}
                  style={{ padding: ".6rem 1rem", borderRadius: 100, border: "1.5px solid rgba(200,129,58,.4)", background: "transparent", color: "#C8813A", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: emailStatus === "saving" ? .7 : 1, alignSelf: "flex-start" }}
                >
                  {emailStatus === "saving" ? (isFR ? "Mise à jour…" : "Updating…") : (isFR ? "Mettre à jour l'email →" : "Update email →")}
                </button>
              </div>
            </div>

            {/* Changer le mot de passe — masqué pour Google */}
            {!isGoogleAccount && (
              <div>
                <p style={{ fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .75rem" }}>
                  {isFR ? "Changer le mot de passe" : "Change password"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                  <input
                    type="password"
                    placeholder={isFR ? "Nouveau mot de passe" : "New password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="password"
                    placeholder={isFR ? "Confirmer le mot de passe" : "Confirm password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                  />
                  {passwordError && <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: 0 }}>{passwordError}</p>}
                  <button
                    onClick={handlePasswordChange}
                    disabled={passwordStatus === "saving"}
                    style={{ padding: ".6rem 1rem", borderRadius: 100, border: "1.5px solid rgba(200,129,58,.4)", background: "transparent", color: "#C8813A", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: passwordStatus === "saving" ? .7 : 1, alignSelf: "flex-start" }}
                  >
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
      </main>
    </div>
  );
}
