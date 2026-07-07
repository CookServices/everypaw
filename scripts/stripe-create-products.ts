/**
 * Run once to create Stripe products & prices for the 3-plan system:
 * free, Premium Digital (monthly), Premium Print (annual).
 *
 *   npx ts-node --project tsconfig.json scripts/stripe-create-products.ts
 *
 * Prerequisites:
 *   STRIPE_SECRET_KEY must be set in your environment (test key: sk_test_...).
 *
 * Output: prints the Price IDs to add to your .env.local and Vercel env vars.
 * Var names match those read in src/lib/stripe-helpers.ts and src/lib/plan.ts.
 *
 * Note: the one-off extra book purchase is priced dynamically per page count
 * (src/app/api/stripe/book-checkout/route.ts) — no Price ID needed for it.
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function main() {
  console.log("Creating Everypaw Stripe products...\n");

  // ── 1. Premium Digital — 4,99 €/mo · $4.99/mo ────────────────────────────────
  const digitalProduct = await stripe.products.create({
    name: "Everypaw Premium Digital",
    description: "Unlimited AI stories, unlimited journal entries, multi-pet profiles.",
    metadata: { plan: "digital" },
  });

  const digitalEur = await stripe.prices.create({
    product: digitalProduct.id,
    unit_amount: 499,
    currency: "eur",
    recurring: { interval: "month" },
    nickname: "Digital Monthly EUR",
    metadata: { plan: "digital" },
  });

  const digitalUsd = await stripe.prices.create({
    product: digitalProduct.id,
    unit_amount: 499,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: "Digital Monthly USD",
    metadata: { plan: "digital" },
  });

  console.log("✓ Premium Digital created");

  // ── 2. Premium Print — 79 €/yr · $79/yr ──────────────────────────────────────
  const printProduct = await stripe.products.create({
    name: "Everypaw Premium Print",
    description: "Everything in Digital + 1 annual hardcover book included.",
    metadata: { plan: "print" },
  });

  const printAnnualEur = await stripe.prices.create({
    product: printProduct.id,
    unit_amount: 7900,
    currency: "eur",
    recurring: { interval: "year" },
    nickname: "Print Annual EUR",
    metadata: { plan: "print" },
  });

  const printAnnualUsd = await stripe.prices.create({
    product: printProduct.id,
    unit_amount: 7900,
    currency: "usd",
    recurring: { interval: "year" },
    nickname: "Print Annual USD",
    metadata: { plan: "print" },
  });

  console.log("✓ Premium Print created");

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("══════════════════════════════════════════");
  console.log("Add these to .env.local AND Vercel env vars:");
  console.log("══════════════════════════════════════════");
  console.log(`STRIPE_PRICE_ID_DIGITAL_EUR=${digitalEur.id}`);
  console.log(`STRIPE_PRICE_ID_DIGITAL_USD=${digitalUsd.id}`);
  console.log(`STRIPE_PRICE_PRINT_ANNUAL_EUR=${printAnnualEur.id}`);
  console.log(`STRIPE_PRICE_PRINT_ANNUAL_USD=${printAnnualUsd.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
