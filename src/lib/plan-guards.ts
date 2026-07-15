// Pure plan guards, zero imports. Split out of plan.ts so client components can
// import them (e.g. via lib/story.ts) without pulling in plan.ts's static
// supabase/server -> next/headers chain.

export type Plan = "free" | "digital" | "print" | "book_only";

export interface PlanInfo {
  plan: Plan;
  isPremium: boolean;
  bookCredits: number;
}

/**
 * Returns null if allowed, or an error string if blocked.
 * Pass current entry count for the user (across all pets).
 */
export function canAddEntry(plan: Plan, totalEntries: number): string | null {
  if (plan === "free" && totalEntries >= 10) return "entry_limit";
  return null;
}

/**
 * Returns null if allowed, or an error string if blocked.
 * Pass current story count for the user (across all pets).
 * IMPORTANT: callers must exclude story_type IN ('origins', 'birthday') from the
 * count, those special stories are always free and must not burn the quota.
 */
export function canGenerateStory(plan: Plan, totalStories: number): string | null {
  if (plan === "free" && totalStories >= 1) return "story_limit";
  return null;
}

/**
 * Returns null if allowed, or an error string if blocked.
 * bookCredits: user's current credit balance.
 */
export function canOrderBook(plan: Plan, bookCredits: number): string | null {
  if (plan === "free") return "upgrade_required";
  if (bookCredits > 0) return null;
  return "no_book_credits";
}

// ── Price ID → plan mapping ───────────────────────────────────────────────────

export function priceIdToPlan(priceId: string): Plan | null {
  const candidates: Array<[string | undefined, Plan]> = [
    // Digital monthly
    [process.env.STRIPE_PRICE_ID_DIGITAL_EUR,         "digital"],
    [process.env.STRIPE_PRICE_ID_DIGITAL_USD,         "digital"],
    // Print annual
    [process.env.STRIPE_PRICE_PRINT_ANNUAL_EUR,       "print"],
    [process.env.STRIPE_PRICE_PRINT_ANNUAL_USD,       "print"],
  ];
  const match = candidates.find(([id]) => id && id === priceId);
  return match ? match[1] : null;
}
