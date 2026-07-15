import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Plan, PlanInfo } from "@/lib/plan-guards";

// Re-exported for the many callers that import it from "@/lib/plan".
export { getServiceSupabase };
export * from "@/lib/plan-guards";

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
// canAddEntry, canGenerateStory, canOrderBook, priceIdToPlan: see plan-guards.ts
// (re-exported above). Kept here only: the guard that needs a DB lookup.

/**
 * Returns true if the user can invite household members.
 * Requires digital or print plan.
 */
export async function canInviteMembers(userId: string): Promise<boolean> {
  const { plan } = await getUserPlanById(userId);
  return plan === "digital" || plan === "print";
}
