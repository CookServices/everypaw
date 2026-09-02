import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { verifyCronRoute } from "@/lib/auth";
import { sendEmail } from "@/lib/resend";
import { log } from "@/lib/log";
import { buildGiftEmailHtml, giftCopy } from "@/lib/gift-email";

/**
 * Sends the gifts bought for a later date.
 *
 * A buyer can pick any date, months out for a birthday or Christmas, so the
 * email cannot ride on the provider's own scheduling (Resend stops at 30 days).
 * /api/gift/complete queues the gift instead, and this runs daily to deliver
 * whatever is due.
 *
 * `sent_at` is written before nothing else can, and rows are picked with
 * `sent_at is null`, so a retried or overlapping run does not send twice. A
 * send that fails leaves the row untouched and is retried the next day.
 */
export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error } = await supabase
    .from("gift_deliveries")
    .select("id, promo_code, recipient_email, sender_name, message, locale, deliver_on")
    .lte("deliver_on", today)
    .is("sent_at", null)
    .limit(100);

  if (error) {
    log.error("[gift-deliveries] query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const gift of due ?? []) {
    const locale: "fr" | "en" = gift.locale === "fr" ? "fr" : "en";

    // Claim the row first: a second run overlapping this one finds nothing.
    const { count } = await supabase
      .from("gift_deliveries")
      .update({ sent_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", gift.id)
      .is("sent_at", null);

    if (!count) continue;

    try {
      await sendEmail({
        from: "Everypaw <hello@everypaw.app>",
        to: gift.recipient_email,
        subject: giftCopy[locale].subject(),
        html: buildGiftEmailHtml({
          locale,
          senderName: gift.sender_name ?? "",
          message: gift.message ?? "",
          code: gift.promo_code,
          redeemUrl: `${process.env.NEXT_PUBLIC_APP_URL}/redeem?code=${gift.promo_code}`,
        }),
      });
      sent++;
    } catch (err) {
      // Hand the row back so tomorrow's run picks it up again.
      await supabase.from("gift_deliveries").update({ sent_at: null }).eq("id", gift.id);
      failed++;
      log.error("[gift-deliveries] send failed for gift", gift.id, err);
    }
  }

  log.info(`[gift-deliveries] due:${due?.length ?? 0} sent:${sent} failed:${failed}`);
  return NextResponse.json({ due: due?.length ?? 0, sent, failed });
}
