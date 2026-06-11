import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type Plan = "free" | "digital" | "print" | "book_only";

export interface PlanInfo {
  plan: Plan;
  isPremium: boolean;
  bookCredits: number;
}

// ── Lookup ────────────────────────────────────────────────────────────────────

/** Server-side: reads profile for the currently authenticated user. */
export async function getUserPlan(): Promise<PlanInfo> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { plan: "free", isPremium: false, bookCredits: 0 };

  const { data } = await supabase
    .from("profiles")
    .select("plan, is_premium, book_credits")
    .eq("id", user.id)
    .single();

  const plan = (data?.plan ?? "free") as Plan;
  return {
    plan,
    isPremium: plan === "digital" || plan === "print" || (data?.is_premium ?? false),
    bookCredits: data?.book_credits ?? 0,
  };
}

/** Service-role variant used inside webhooks (no auth session). */
export function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function getUserPlanById(userId: string): Promise<PlanInfo> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("plan, is_premium, book_credits")
    .eq("id", userId)
    .single();

  const plan = (data?.plan ?? "free") as Plan;
  return {
    plan,
    isPremium: plan === "digital" || plan === "print" || (data?.is_premium ?? false),
    bookCredits: data?.book_credits ?? 0,
  };
}

// ── Guards ────────────────────────────────────────────────────────────────────

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
 * Returns true if the user can invite household members.
 * Requires digital or print plan.
 */
export async function canInviteMembers(userId: string): Promise<boolean> {
  const { plan } = await getUserPlanById(userId);
  return plan === "digital" || plan === "print";
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
    // EUR variants
    [process.env.STRIPE_PRICE_ID_DIGITAL_EUR,         "digital"],
    [process.env.STRIPE_PRICE_ID_PRINT_EUR,           "print"],
    // USD variants
    [process.env.STRIPE_PRICE_ID_DIGITAL_USD,         "digital"],
    [process.env.STRIPE_PRICE_ID_PRINT_USD,           "print"],
    // Annual, digital
    [process.env.STRIPE_PRICE_ID_DIGITAL_ANNUAL_EUR,  "digital"],
    [process.env.STRIPE_PRICE_ID_DIGITAL_ANNUAL_USD,  "digital"],
    // Annual, print
    [process.env.STRIPE_PRICE_PRINT_ANNUAL,           "print"],
    [process.env.STRIPE_PRICE_PRINT_ANNUAL_EUR,       "print"],
    [process.env.STRIPE_PRICE_PRINT_ANNUAL_USD,       "print"],
    // Legacy
    [process.env.STRIPE_PRICE_DIGITAL_MONTHLY,        "digital"],
    [process.env.STRIPE_PRICE_PRINT_MONTHLY,          "print"],
    [process.env.STRIPE_PRICE_ID,                     "digital"],
  ];
  const match = candidates.find(([id]) => id && id === priceId);
  return match ? match[1] : null;
}
