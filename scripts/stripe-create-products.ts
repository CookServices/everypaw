/**
 * Run once to create Stripe products & prices for the new pricing structure.
 *
 *   npx ts-node --project tsconfig.json scripts/stripe-create-products.ts
 *
 * Prerequisites:
 *   STRIPE_SECRET_KEY must be set in your environment (test key: sk_test_...).
 *
 * Output: prints the Price IDs to add to your .env.local and Vercel env vars.
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function main() {
  console.log("Creating Everypaw Stripe products...\n");

  // ── 1. Premium Digital — $4.99/month ────────────────────────────────────────
  const digitalProduct = await stripe.products.create({
    name: "Everypaw Premium Digital",
    description: "Unlimited AI stories, unlimited journal entries, multi-pet profiles.",
    metadata: { plan: "digital" },
  });

  const digitalMonthlyPrice = await stripe.prices.create({
    product: digitalProduct.id,
    unit_amount: 499,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: "Digital Monthly",
    metadata: { plan: "digital" },
  });

  console.log("✓ Premium Digital created");
  console.log(`  STRIPE_PRICE_DIGITAL_MONTHLY=${digitalMonthlyPrice.id}\n`);

  // ── 2. Premium Print — $9.99/month + $79/year ────────────────────────────────
  const printProduct = await stripe.products.create({
    name: "Everypaw Premium Print",
    description: "Everything in Digital + 1 annual hardcover book included.",
    metadata: { plan: "print" },
  });

  const printMonthlyPrice = await stripe.prices.create({
    product: printProduct.id,
    unit_amount: 999,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: "Print Monthly",
    metadata: { plan: "print" },
  });

  const printAnnualPrice = await stripe.prices.create({
    product: printProduct.id,
    unit_amount: 7900,
    currency: "usd",
    recurring: { interval: "year" },
    nickname: "Print Annual",
    metadata: { plan: "print" },
  });

  console.log("✓ Premium Print created");
  console.log(`  STRIPE_PRICE_PRINT_MONTHLY=${printMonthlyPrice.id}`);
  console.log(`  STRIPE_PRICE_PRINT_ANNUAL=${printAnnualPrice.id}\n`);

  // ── 3. Book à la carte — $29 one-time ────────────────────────────────────────
  const bookProduct = await stripe.products.create({
    name: "Everypaw Book",
    description: "One hardcover pet journal book (no subscription).",
    metadata: { plan: "book_only" },
  });

  const bookPrice = await stripe.prices.create({
    product: bookProduct.id,
    unit_amount: 2900,
    currency: "usd",
    nickname: "Book One-Time",
    metadata: { plan: "book_only" },
  });

  console.log("✓ Book à la carte created");
  console.log(`  STRIPE_PRICE_BOOK_ONCE=${bookPrice.id}\n`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("══════════════════════════════════════════");
  console.log("Add these to .env.local AND Vercel env vars:");
  console.log("══════════════════════════════════════════");
  console.log(`STRIPE_PRICE_DIGITAL_MONTHLY=${digitalMonthlyPrice.id}`);
  console.log(`STRIPE_PRICE_PRINT_MONTHLY=${printMonthlyPrice.id}`);
  console.log(`STRIPE_PRICE_PRINT_ANNUAL=${printAnnualPrice.id}`);
  console.log(`STRIPE_PRICE_BOOK_ONCE=${bookPrice.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
