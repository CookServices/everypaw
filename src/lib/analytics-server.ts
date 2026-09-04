/**
 * Server-side purchase events (spec P0-1, docs/print/specs.md).
 *
 * The browser trackers sit behind cookie consent and the payment itself ends on
 * Stripe's domain, so a subscription paid by someone who refused cookies is
 * invisible. The Stripe webhook is the only place that sees every payment, so
 * revenue is reported from there.
 *
 * No user data leaves this module: no email, no hashed email, no browser id.
 * GA4 requires a `client_id` and Meta rejects an event with an empty
 * `user_data`, so both get an identifier derived from the Stripe event id -
 * unique per purchase, therefore unlinkable to an account or to a browser.
 * The trade-off was accepted on 2026-09-02: no ad attribution from these
 * events, they measure volume and revenue.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/log";

/** Every destination call is capped so a slow endpoint cannot hold the webhook. */
const TIMEOUT_MS = 3000;

const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
const META_ENDPOINT = "https://graph.facebook.com/v21.0";

/** `event_type` of the events_log row that makes a replayed Stripe event a no-op. */
export const PURCHASE_EVENT_TYPE = "analytics_purchase";

export type PurchaseInput = {
  /** "digital", "print", "book_only", or a gift variant. */
  plan: string;
  amountCents: number;
  /** ISO code as Stripe returns it, lowercase. */
  currency: string;
  /** Stripe event id: transaction id, dedup key, and seed of both identifiers. */
  eventId: string;
  /** "subscription_create", "subscription_cycle", "book_purchase", "gift". */
  billingReason: string;
};

/**
 * A purchase that can be claimed against an account. A gift cannot: its
 * checkout is anonymous, so it is reported without a claim.
 */
export type PurchaseClaim = PurchaseInput & {
  /** Owner of the payment. Written to events_log, never sent to a destination. */
  userId: string;
};

function gaConfig() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA_API_SECRET;
  return measurementId && apiSecret ? { measurementId, apiSecret } : null;
}

function metaConfig() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  return pixelId && token ? { pixelId, token } : null;
}

/**
 * Whether any destination is reachable. The webhook checks this before doing
 * any work at all, so cutting the environment variables leaves the money paths
 * byte for byte as they were.
 */
export function analyticsConfigured(): boolean {
  return gaConfig() !== null || metaConfig() !== null;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * GA4 expects the `<random>.<timestamp>` shape its browser tag produces. Built
 * from the event id so it is stable across a replay and carries nothing about
 * the buyer.
 */
export function gaClientId(eventId: string): string {
  const hex = sha256Hex(eventId);
  const left = parseInt(hex.slice(0, 8), 16);
  const right = parseInt(hex.slice(8, 16), 16);
  return `${left}.${right}`;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function sendGa4(input: PurchaseInput, value: number): Promise<void> {
  const config = gaConfig();
  if (!config) return;

  const url = `${GA_ENDPOINT}?measurement_id=${encodeURIComponent(config.measurementId)}&api_secret=${encodeURIComponent(config.apiSecret)}`;
  const res = await postJson(url, {
    client_id: gaClientId(input.eventId),
    non_personalized_ads: true,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: input.eventId,
          currency: input.currency.toUpperCase(),
          value,
          items: [{ item_id: input.plan, item_name: input.plan, price: value, quantity: 1 }],
        },
      },
    ],
  });

  // The Measurement Protocol answers 204 even for a malformed payload, so a
  // non-2xx here is a transport or credential problem, worth a line in the logs.
  if (!res.ok) {
    log.error("[analytics] GA4 purchase rejected:", res.status, "event:", input.eventId);
  }
}

async function sendMeta(input: PurchaseInput, value: number): Promise<void> {
  const config = metaConfig();
  if (!config) return;

  const url = `${META_ENDPOINT}/${encodeURIComponent(config.pixelId)}/events?access_token=${encodeURIComponent(config.token)}`;
  const res = await postJson(url, {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        // Deduplicates against a browser Purchase event, should one ever be added.
        event_id: input.eventId,
        action_source: "website",
        // Meta refuses an event whose user_data is empty. This is the only
        // identifier sent, and it identifies the purchase, not the buyer.
        user_data: { external_id: sha256Hex(input.eventId) },
        custom_data: {
          currency: input.currency.toLowerCase(),
          value,
          content_type: "product",
          content_ids: [input.plan],
        },
      },
    ],
  });

  if (!res.ok) {
    log.error("[analytics] Meta purchase rejected:", res.status, "event:", input.eventId);
  }
}

/**
 * Reports one purchase to every configured destination. Never throws and never
 * rejects: a failure here must not fail the webhook, or Stripe replays the
 * billing event.
 */
export async function trackPurchase(input: PurchaseInput): Promise<void> {
  if (!analyticsConfigured()) return;

  // Stripe amounts are in the currency's minor unit, GA4 and Meta both want the
  // major unit. Zero-decimal currencies (JPY) would need a table here; the two
  // currencies in use are EUR and USD.
  const value = Math.round(input.amountCents) / 100;

  const results = await Promise.allSettled([sendGa4(input, value), sendMeta(input, value)]);
  for (const result of results) {
    if (result.status === "rejected") {
      log.error("[analytics] purchase send failed:", result.reason, "event:", input.eventId);
    }
  }
}

/**
 * Sends the purchase unless this Stripe event was already reported. The claim
 * is written to events_log before the send, so a Stripe replay arriving while
 * the first call is in flight cannot double-count; the cost is that a failed
 * send is lost rather than retried, which is the right way round for a metric.
 */
export async function recordPurchaseOnce(
  supabase: SupabaseClient,
  input: PurchaseClaim,
): Promise<void> {
  if (!analyticsConfigured()) return;

  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    // A fully discounted invoice (a redeemed gift) is not revenue.
    log.debug("[analytics] skipping non-positive amount, event:", input.eventId);
    return;
  }

  try {
    const { data: existing } = await supabase
      .from("events_log")
      .select("id")
      .eq("event_type", PURCHASE_EVENT_TYPE)
      .contains("metadata", { stripe_event_id: input.eventId })
      .maybeSingle();

    if (existing) {
      log.debug("[analytics] purchase already reported, skipping:", input.eventId);
      return;
    }

    await supabase.from("events_log").insert({
      user_id: input.userId,
      event_type: PURCHASE_EVENT_TYPE,
      metadata: {
        stripe_event_id: input.eventId,
        plan: input.plan,
        billing_reason: input.billingReason,
        amount_cents: input.amountCents,
        currency: input.currency,
      },
    });

    await trackPurchase(input);
  } catch (err) {
    log.error("[analytics] purchase reporting failed:", err, "event:", input.eventId);
  }
}
