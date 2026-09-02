import { escapeHtml } from "@/lib/html";
import { BRAND, baseLayout, hero, ctaButton, heroSection, colorSection, divider } from "@/lib/email-templates";

export function buildConfirmSignupEmail(lang: "fr" | "en", confirmUrl: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "🐾 Confirmez votre adresse email, Everypaw",
      html: baseLayout(`
        ${hero({ illustration: "paw", emoji: "🐾", heading: "Bienvenue sur Everypaw !" })}
        <p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Vous êtes à un clic de commencer à capturer les plus beaux moments de votre animal.</p>
        ${colorSection("Confirmez votre adresse email pour continuer", BRAND.accent, "#FDFAF5")}
        ${ctaButton(confirmUrl, "Confirmer mon email")}
        <p style="font-size:13px;color:#9A8070;margin:16px 0 0;line-height:1.5;">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte Everypaw, ignorez cet email.</p>
      `, "", "fr", "Un clic et votre journal est ouvert."),
    };
  }
  return {
    subject: "🐾 Confirm your email address, Everypaw",
    html: baseLayout(`
      ${hero({ illustration: "paw", emoji: "🐾", heading: "Welcome to Everypaw!" })}
      <p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">You're one click away from starting to capture your pet's most beautiful moments.</p>
      ${colorSection("Confirm your email to get started", BRAND.accent, "#FDFAF5")}
      ${ctaButton(confirmUrl, "Confirm my email")}
      <p style="font-size:13px;color:#9A8070;margin:16px 0 0;line-height:1.5;">This link expires in 24 hours. If you didn't create an Everypaw account, please ignore this email.</p>
    `, "", "en", "One click and your journal is open."),
  };
}

export function buildResetPasswordEmail(lang: "fr" | "en", resetUrl: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "🔑 Réinitialisez votre mot de passe, Everypaw",
      html: baseLayout(`
        ${heroSection("🔑", "Réinitialisation du mot de passe")}
        <p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez ci-dessous pour en choisir un nouveau :</p>
        ${colorSection("Votre lien d'accès expire dans 1 heure", "#A67C52", "#FDFAF5")}
        ${ctaButton(resetUrl, "Réinitialiser mon mot de passe")}
        <p style="font-size:13px;color:#9A8070;margin:16px 0 0;line-height:1.5;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email, votre mot de passe reste inchangé.</p>
      `, "", "fr", "Lien valable une heure."),
    };
  }
  return {
    subject: "🔑 Reset your password, Everypaw",
    html: baseLayout(`
      ${heroSection("🔑", "Password reset")}
      <p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">You requested to reset your password. Click below to choose a new one:</p>
      ${colorSection("Your reset link expires in 1 hour", "#A67C52", "#FDFAF5")}
      ${ctaButton(resetUrl, "Reset my password")}
      <p style="font-size:13px;color:#9A8070;margin:16px 0 0;line-height:1.5;">If you didn't request this reset, please ignore this email, your password remains unchanged.</p>
    `, "", "en", "This link is valid for one hour."),
  };
}

export function buildPaymentFailedEmail(lang: "fr" | "en", billingPortalUrl: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "⚠️ Problème de paiement sur votre abonnement Everypaw",
      html: baseLayout(`
        ${heroSection("⚠️", "Votre paiement n'a pas abouti")}
        <p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">Nous n'avons pas pu traiter le paiement de votre abonnement Everypaw.</p>
        ${colorSection("Mettez à jour votre moyen de paiement maintenant pour continuer", "#E74C3C", "#FDFAF5")}
        ${ctaButton(billingPortalUrl, "Mettre à jour ma carte")}
        <p style="font-size:13px;color:#9A8070;margin:16px 0 0;line-height:1.5;">Stripe effectuera plusieurs tentatives automatiquement. Si le paiement échoue, votre accès Premium sera suspendu.</p>
      `, "", "fr", "Votre abonnement a besoin d'un nouveau moyen de paiement."),
    };
  }
  return {
    subject: "⚠️ Payment issue on your Everypaw subscription",
    html: baseLayout(`
      ${heroSection("⚠️", "Your payment didn't go through")}
      <p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 24px;">We were unable to process the payment for your Everypaw subscription.</p>
      ${colorSection("Update your payment method now to continue", "#E74C3C", "#FDFAF5")}
      ${ctaButton(billingPortalUrl, "Update my card")}
      <p style="font-size:13px;color:#9A8070;margin:16px 0 0;line-height:1.5;">Stripe will automatically retry the charge. If payment continues to fail, your Premium access will be suspended.</p>
    `, "", "en", "Your subscription needs a new payment method."),
  };
}

export function buildChangeEmailEmail(lang: "fr" | "en", confirmUrl: string, newEmail: string): { subject: string; html: string } {
  if (lang === "fr") {
    return {
      subject: "📧 Confirmez votre nouvelle adresse email, Everypaw",
      html: baseLayout(`
        ${heroSection("📧", "Changement d'adresse email")}
        <p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">Vous avez demandé à changer votre adresse email vers :</p>
        <p style="font-size:15px;font-weight:600;color:${BRAND.text};margin:0 0 24px;">${escapeHtml(newEmail)}</p>
        ${colorSection("Confirmez cette modification maintenant", BRAND.accent, "#FDFAF5")}
        ${ctaButton(confirmUrl, "Confirmer le changement")}
        <p style="font-size:13px;color:#9A8070;margin:16px 0 0;line-height:1.5;">Ce lien expire dans 24 heures. Si vous n'avez pas demandé ce changement, ignorez cet email.</p>
      `, "", "fr", "Confirmez pour terminer le changement d'adresse."),
    };
  }
  return {
    subject: "📧 Confirm your new email address, Everypaw",
    html: baseLayout(`
      ${heroSection("📧", "Email address change")}
      <p style="font-size:14px;color:${BRAND.muted};line-height:1.65;margin:0 0 8px;">You requested to change your email address to:</p>
      <p style="font-size:15px;font-weight:600;color:${BRAND.text};margin:0 0 24px;">${escapeHtml(newEmail)}</p>
      ${colorSection("Confirm this change now", BRAND.accent, "#FDFAF5")}
      ${ctaButton(confirmUrl, "Confirm the change")}
      <p style="font-size:13px;color:#9A8070;margin:16px 0 0;line-height:1.5;">This link expires in 24 hours. If you didn't request this change, please ignore this email.</p>
    `, "", "en", "Confirm to finish changing your address."),
  };
}
