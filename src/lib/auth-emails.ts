import { escapeHtml } from "@/lib/html";
import { BRAND, baseLayout, ctaButton } from "@/lib/email-templates";

export function buildConfirmSignupEmail(lang: "fr" | "en", confirmUrl: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "🐾 Confirmez votre adresse email, Everypaw",
      html: baseLayout(`
        <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Bienvenue sur Everypaw !</h1>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">Vous êtes à un clic de commencer à capturer les plus beaux moments de votre animal.</p>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Cliquez sur le bouton ci-dessous pour confirmer votre adresse email :</p>
        ${ctaButton(confirmUrl, "Confirmer mon email")}
        <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte Everypaw, ignorez cet email.</p>
      `, "", "fr"),
    };
  }
  return {
    subject: "🐾 Confirm your email address, Everypaw",
    html: baseLayout(`
      <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Welcome to Everypaw!</h1>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">You're one click away from starting to capture your pet's most beautiful moments.</p>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Click the button below to confirm your email address:</p>
      ${ctaButton(confirmUrl, "Confirm my email")}
      <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">This link expires in 24 hours. If you didn't create an Everypaw account, please ignore this email.</p>
    `, "", "en"),
  };
}

export function buildResetPasswordEmail(lang: "fr" | "en", resetUrl: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "🔑 Réinitialisez votre mot de passe, Everypaw",
      html: baseLayout(`
        <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Réinitialisation du mot de passe</h1>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        ${ctaButton(resetUrl, "Réinitialiser mon mot de passe")}
        <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email, votre mot de passe reste inchangé.</p>
      `, "", "fr"),
    };
  }
  return {
    subject: "🔑 Reset your password, Everypaw",
    html: baseLayout(`
      <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Password reset</h1>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">You requested to reset your password. Click the button below to choose a new password:</p>
      ${ctaButton(resetUrl, "Reset my password")}
      <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">This link expires in 1 hour. If you didn't request this reset, please ignore this email, your password remains unchanged.</p>
    `, "", "en"),
  };
}

export function buildPaymentFailedEmail(lang: "fr" | "en", billingPortalUrl: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "⚠️ Problème de paiement sur votre abonnement Everypaw",
      html: baseLayout(`
        <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Votre paiement n'a pas abouti</h1>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">Nous n'avons pas pu traiter le paiement de votre abonnement Everypaw.</p>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Mettez à jour votre moyen de paiement pour continuer à profiter de toutes les fonctionnalités :</p>
        ${ctaButton(billingPortalUrl, "Mettre à jour ma carte")}
        <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">Stripe effectuera plusieurs tentatives de prélèvement automatiquement. Si le paiement échoue à nouveau, votre accès Premium sera suspendu.</p>
      `, "", "fr"),
    };
  }
  return {
    subject: "⚠️ Payment issue on your Everypaw subscription",
    html: baseLayout(`
      <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Your payment didn't go through</h1>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">We were unable to process the payment for your Everypaw subscription.</p>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Please update your payment method to continue enjoying all features:</p>
      ${ctaButton(billingPortalUrl, "Update my card")}
      <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">Stripe will automatically retry the charge. If payment continues to fail, your Premium access will be suspended.</p>
    `, "", "en"),
  };
}

export function buildChangeEmailEmail(lang: "fr" | "en", confirmUrl: string, newEmail: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "📧 Confirmez votre nouvelle adresse email, Everypaw",
      html: baseLayout(`
        <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Changement d'adresse email</h1>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">Vous avez demandé à changer votre adresse email vers :</p>
        <p style="font-size:.95rem;font-weight:600;color:${BRAND.text};margin:0 0 24px;">${escapeHtml(newEmail)}</p>
        <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Cliquez sur le bouton ci-dessous pour confirmer ce changement :</p>
        ${ctaButton(confirmUrl, "Confirmer le changement")}
        <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">Ce lien expire dans 24 heures. Si vous n'avez pas demandé ce changement, ignorez cet email.</p>
      `, "", "fr"),
    };
  }
  return {
    subject: "📧 Confirm your new email address, Everypaw",
    html: baseLayout(`
      <h1 style="font-family:Georgia,serif;font-size:1.4rem;font-weight:600;color:${BRAND.text};margin:0 0 12px;">Email address change</h1>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">You requested to change your email address to:</p>
      <p style="font-size:.95rem;font-weight:600;color:${BRAND.text};margin:0 0 24px;">${escapeHtml(newEmail)}</p>
      <p style="font-size:.9rem;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Click the button below to confirm this change:</p>
      ${ctaButton(confirmUrl, "Confirm the change")}
      <p style="font-size:.78rem;color:#9A8070;margin:16px 0 0;line-height:1.5;">This link expires in 24 hours. If you didn't request this change, please ignore this email.</p>
    `, "", "en"),
  };
}
