import { escapeHtml } from "@/lib/html";
import { baseLayout, hero, paragraph, quote, codeBox, ctaButton, finePrint, colorSection, divider, BRAND } from "@/lib/email-templates";

/**
 * The gift email, shared by the two paths that send it: /api/gift/complete for
 * a gift to deliver now, and the daily cron for one bought with a future date.
 */

export const giftCopy = {
  fr: {
    subject: () => `🎁 Vous avez reçu un cadeau Everypaw !`,
    heading: "Vous avez reçu un cadeau !",
    body: (sender: string) =>
      `<strong>${sender}</strong> vous offre 12 mois d'Everypaw Premium, le journal IA qui transforme les moments du quotidien de votre animal en un beau livre imprimé.`,
    codeLabel: "Votre code cadeau :",
    cta: "Activer mon cadeau",
    footer: "Code valable 12 mois · Usage unique. Aucune carte bancaire requise pour l'activer.",
  },
  en: {
    subject: () => `🎁 You've received an Everypaw gift!`,
    heading: "You've received a gift!",
    body: (sender: string) =>
      `<strong>${sender}</strong> gifted you 12 months of Everypaw Premium, the AI journal that turns your pet's daily moments into a beautiful printed book.`,
    codeLabel: "Your gift code:",
    cta: "Activate my gift",
    footer: "Code valid for 12 months · Single use. No credit card required to redeem.",
  },
};

export function buildGiftEmailHtml({
  locale,
  senderName,
  message,
  code,
  redeemUrl,
}: {
  locale: "fr" | "en";
  senderName: string;
  message: string;
  code: string;
  redeemUrl: string;
}): string {
  const c = giftCopy[locale] ?? giftCopy.en;
  return baseLayout(
    hero({ illustration: "bone", emoji: "🎁", heading: c.heading }) +
    paragraph(c.body(escapeHtml(senderName))) +
    (message ? quote(`"${escapeHtml(message)}"`) : "") +
    divider() +
    paragraph(`<strong>${c.codeLabel}</strong>`) +
    codeBox(code) +
    colorSection(
      locale === "en"
        ? `<strong>Ready to get started?</strong> Click below to activate your gift and start capturing your pet's story.`
        : `<strong>Prêt(e) à commencer ?</strong> Cliquez ci-dessous pour activer votre cadeau et commencer à capturer l'histoire de votre animal.`,
      BRAND.accent,
      "#FDFAF5"
    ) +
    ctaButton(redeemUrl, c.cta) +
    finePrint(c.footer),
    "",
    locale,
    locale === "en" ? `${senderName} gifted you 12 months of Everypaw.` : `${senderName} vous offre 12 mois d'Everypaw.`,
  );
}

/**
 * Whether a gift is for later, and on which day.
 *
 * The buyer picks a date with no upper bound, which is the point: a gift is
 * often bought for a birthday or for Christmas, months ahead. Resend's own
 * scheduling stops at 30 days, so anything dated ahead is stored and sent by
 * the daily cron instead. Only a date strictly after today counts as later; a
 * gift dated today leaves immediately, which is what the buyer expects.
 */
export function giftDeliveryDay(scheduledDate: string | null | undefined, now = new Date()): string | null {
  if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return null;
  const today = now.toISOString().slice(0, 10);
  return scheduledDate > today ? scheduledDate : null;
}
