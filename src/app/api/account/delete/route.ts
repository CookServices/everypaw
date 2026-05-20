import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = getServiceSupabase();

  // 1. Get profile for Stripe IDs
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  // 2. Cancel Stripe subscription immediately if active
  if (profile?.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      console.log(`[account/delete] Stripe subscription cancelled: ${profile.stripe_subscription_id}`);
    } catch (err) {
      console.warn("[account/delete] Stripe cancel warning (may already be cancelled):", err);
    }
  }

  // 3. Delete photos from storage (bucket: pet-photos, path: {userId}/*)
  try {
    const { data: files } = await adminSupabase.storage
      .from("pet-photos")
      .list(user.id, { limit: 1000 });

    if (files && files.length > 0) {
      const paths = files.map(f => `${user.id}/${f.name}`);
      await adminSupabase.storage.from("pet-photos").remove(paths);

      // Also list sub-folders (pet-specific folders like {userId}/{petId}/)
      for (const file of files) {
        if (!file.id) {
          // It's a folder prefix — list contents
          const { data: subFiles } = await adminSupabase.storage
            .from("pet-photos")
            .list(`${user.id}/${file.name}`, { limit: 1000 });
          if (subFiles && subFiles.length > 0) {
            const subPaths = subFiles.map(sf => `${user.id}/${file.name}/${sf.name}`);
            await adminSupabase.storage.from("pet-photos").remove(subPaths);
          }
        }
      }
    }
    console.log(`[account/delete] Storage cleaned for user: ${user.id}`);
  } catch (err) {
    console.warn("[account/delete] Storage cleanup warning:", err);
    // Non-fatal — continue with DB deletion
  }

  // 4. Delete DB records in cascade order
  try {
    // Get pet IDs first for cascaded deletes
    const { data: pets } = await adminSupabase
      .from("pets")
      .select("id")
      .eq("user_id", user.id);

    const petIds = pets?.map(p => p.id) ?? [];

    if (petIds.length > 0) {
      await adminSupabase.from("entries").delete().in("pet_id", petIds);
      await adminSupabase.from("stories").delete().in("pet_id", petIds);
      await adminSupabase.from("milestones").delete().in("pet_id", petIds);
    }

    await adminSupabase.from("pets").delete().eq("user_id", user.id);
    await adminSupabase.from("profiles").delete().eq("id", user.id);

    console.log(`[account/delete] DB records deleted for user: ${user.id}`);
  } catch (err) {
    console.error("[account/delete] DB deletion error:", err);
    return NextResponse.json({ error: "Failed to delete account data" }, { status: 500 });
  }

  // 5. Delete auth user (service role required)
  try {
    const { error } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (error) throw error;
    console.log(`[account/delete] Auth user deleted: ${user.id}`);
  } catch (err) {
    console.error("[account/delete] Auth user deletion error:", err);
    return NextResponse.json({ error: "Failed to delete auth user" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
