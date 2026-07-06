import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";

import { UUID_REGEX } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = params.id;
  if (!UUID_REGEX.test(memberId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = getServiceSupabase();

  // Fetch the member row and verify ownership via pet
  const { data: member } = await db
    .from("pet_members")
    .select("id, pet_id, status")
    .eq("id", memberId)
    .single();

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify caller owns the pet
  const { data: pet } = await db
    .from("pets")
    .select("user_id")
    .eq("id", member.pet_id)
    .single();

  if (!pet || pet.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (member.status === "revoked") {
    return NextResponse.json({ success: true }); // idempotent
  }

  const { error } = await db
    .from("pet_members")
    .update({ status: "revoked" })
    .eq("id", memberId);

  if (error) {
    log.error("[pet-members/revoke] update error:", error.message);
    return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
