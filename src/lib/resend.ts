import { Resend } from "resend";
import { htmlToText } from "@/lib/email-text";

export function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

type SendEmailOptions = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  /** Snake case on purpose: that is the field name in the Resend SDK 3.5.0. */
  reply_to?: string;
  /**
   * ISO date carried by the gift flow. ⚠️ Resend 3.5.0 has no scheduling
   * field, so this is passed through and ignored by the API today. Kept to
   * preserve the existing call, see the note in gift/complete.
   */
  scheduledAt?: string;
  /**
   * Present on anything a user can opt out of (the cron mails). Adds the
   * List-Unsubscribe headers Gmail and Yahoo expect from bulk senders, which
   * also gives the client its native "unsubscribe" affordance next to the
   * sender name. Leave it out for transactional mail: auth, receipts, dunning.
   */
  unsubscribeUrl?: string;
};

/**
 * Single entry point for every outgoing email.
 *
 * Adds the text/plain alternative (derived from the HTML, see email-text.ts)
 * and the unsubscribe headers, so no send site can forget either.
 */
export async function sendEmail({ from, to, subject, html, reply_to, scheduledAt, unsubscribeUrl }: SendEmailOptions) {
  const resend = getResendClient();
  return resend.emails.send({
    from,
    to,
    subject,
    html,
    text: htmlToText(html),
    ...(reply_to ? { reply_to } : {}),
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(unsubscribeUrl
      ? {
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  });
}
