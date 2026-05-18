const BRAND = {
  bg: "#FDFAF5",
  headerBg: "#3D1F0D",
  accent: "#C8813A",
  text: "#3D2B1F",
  muted: "#7A5C44",
};

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- Header -->
        <tr><td style="background:${BRAND.headerBg};border-radius:16px 16px 0 0;padding:20px 32px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:1.2rem;font-weight:600;color:#FDFAF5;">
            🐾 Everypaw
          </span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border:1px solid rgba(61,43,31,.08);border-top:none;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:${BRAND.bg};border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;border:1px solid rgba(61,43,31,.08);border-top:none;">
          <p style="margin:0;font-size:.75rem;color:${BRAND.muted};">© 2025 Everypaw · <a href="https://everypaw.app" style="color:${BRAND.accent};text-decoration:none;">everypaw.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.accent};color:#FDFAF5;padding:14px 28px;border-radius:100px;text-decoration:none;font-family:inherit;font-size:.95rem;font-weight:500;margin:24px 0;">${label}</a>`;
}

export function buildConfirmSignupEmail(lang: "fr" | "en", confirmUrl: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "🐾 Confirmez votre adresse email — Everypaw",
      html: baseLayout(`
        <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Bienvenue sur Everypaw !</h1>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">Vous êtes à un clic de commencer à capturer les plus beaux moments de votre animal.</p>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Cliquez sur le bouton ci-dessous pour confirmer votre adresse email :</p>
        ${ctaButton(confirmUrl, "Confirmer mon email →")}
        <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte Everypaw, ignorez cet email.</p>
      `),
    };
  }
  return {
    subject: "🐾 Confirm your email address — Everypaw",
    html: baseLayout(`
      <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Welcome to Everypaw!</h1>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">You're one click away from starting to capture your pet's most beautiful moments.</p>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Click the button below to confirm your email address:</p>
      ${ctaButton(confirmUrl, "Confirm my email →")}
      <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">This link expires in 24 hours. If you didn't create an Everypaw account, please ignore this email.</p>
    `),
  };
}

export function buildResetPasswordEmail(lang: "fr" | "en", resetUrl: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "🔑 Réinitialisez votre mot de passe — Everypaw",
      html: baseLayout(`
        <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Réinitialisation du mot de passe</h1>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        ${ctaButton(resetUrl, "Réinitialiser mon mot de passe →")}
        <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe reste inchangé.</p>
      `),
    };
  }
  return {
    subject: "🔑 Reset your password — Everypaw",
    html: baseLayout(`
      <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Password reset</h1>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">You requested to reset your password. Click the button below to choose a new password:</p>
      ${ctaButton(resetUrl, "Reset my password →")}
      <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">This link expires in 1 hour. If you didn't request this reset, please ignore this email — your password remains unchanged.</p>
    `),
  };
}

export function buildChangeEmailEmail(lang: "fr" | "en", confirmUrl: string, newEmail: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "📧 Confirmez votre nouvelle adresse email — Everypaw",
      html: baseLayout(`
        <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Changement d'adresse email</h1>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">Vous avez demandé à changer votre adresse email vers :</p>
        <p style="font-size:.95rem;font-weight:600;color:${BRAND.text};margin:0 0 24px;">${newEmail}</p>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Cliquez sur le bouton ci-dessous pour confirmer ce changement :</p>
        ${ctaButton(confirmUrl, "Confirmer le changement →")}
        <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">Ce lien expire dans 24 heures. Si vous n'avez pas demandé ce changement, ignorez cet email.</p>
      `),
    };
  }
  return {
    subject: "📧 Confirm your new email address — Everypaw",
    html: baseLayout(`
      <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Email address change</h1>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">You requested to change your email address to:</p>
      <p style="font-size:.95rem;font-weight:600;color:${BRAND.text};margin:0 0 24px;">${newEmail}</p>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Click the button below to confirm this change:</p>
      ${ctaButton(confirmUrl, "Confirm the change →")}
      <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">This link expires in 24 hours. If you didn't request this change, please ignore this email.</p>
    `),
  };
}
