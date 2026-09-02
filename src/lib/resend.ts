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
  replyTo?: string;
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
export async function sendEmail({ from, to, subject, html, replyTo, unsubscribeUrl }: SendEmailOptions) {
  const resend = getResendClient();
  return resend.emails.send({
    from,
    to,
    subject,
    html,
    text: htmlToText(html),
    ...(replyTo ? { replyTo } : {}),
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
