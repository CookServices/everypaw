import Stripe from "stripe";

/** Shared Stripe client. Pins the API version so account-level changes can't
 *  silently alter behavior, and avoids re-instantiating per request. */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});
