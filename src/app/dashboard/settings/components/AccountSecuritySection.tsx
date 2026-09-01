import type { Dispatch, SetStateAction } from "react";
import PasswordStrength from "@/components/PasswordStrength";
import { inputStyle, btnOutline } from "../constants";

type AuthStatus = "idle" | "saving" | "done" | "error";

interface Props {
  isFR: boolean;
  isGoogleAccount: boolean;
  currentEmail: string;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  emailError: string;
  handleEmailChange: () => void;
  emailStatus: AuthStatus;
  currentPassword: string;
  setCurrentPassword: Dispatch<SetStateAction<string>>;
  newPassword: string;
  setNewPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  passwordError: string;
  handlePasswordChange: () => void;
  passwordStatus: AuthStatus;
}

export default function AccountSecuritySection({
  isFR,
  isGoogleAccount,
  currentEmail,
  newEmail,
  setNewEmail,
  emailError,
  handleEmailChange,
  emailStatus,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordError,
  handlePasswordChange,
  passwordStatus,
}: Props) {
  return (
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
            {emailStatus === "saving" ? (isFR ? "Mise à jour…" : "Updating…") : (isFR ? "Mettre à jour l'email" : "Update email")}
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
            <input type="password" placeholder={isFR ? "Nouveau mot de passe (min. 8 caractères)" : "New password (min. 8 characters)"} value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
            <PasswordStrength password={newPassword} isFR={isFR} />
            <input type="password" placeholder={isFR ? "Confirmer le mot de passe" : "Confirm password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
            {passwordError && <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: 0 }}>{passwordError}</p>}
            <button onClick={handlePasswordChange} disabled={passwordStatus === "saving"} style={{ ...btnOutline, opacity: passwordStatus === "saving" ? .7 : 1 }}>
              {passwordStatus === "saving" ? (isFR ? "Mise à jour…" : "Updating…") : (isFR ? "Mettre à jour le mot de passe" : "Update password")}
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
  );
}
