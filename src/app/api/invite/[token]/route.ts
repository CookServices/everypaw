import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";

const TOKEN_REGEX = /^[0-9a-f]{64}$/i;

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!TOKEN_REGEX.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const db = getServiceSupabase();
  const { data: member } = await db
    .from("pet_members")
    .select("id, pet_id, invited_email, status, invite_token_expires_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (member.status === "revoked") {
    return NextResponse.json({ error: "revoked" }, { status: 410 });
  }
  if (member.status === "accepted") {
    return NextResponse.json({ error: "already_accepted" }, { status: 409 });
  }
  if (new Date(member.invite_token_expires_at) < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Fetch pet name for display
  const { data: pet } = await db
    .from("pets")
    .select("name, species")
    .eq("id", member.pet_id)
    .single();

  return NextResponse.json({
    status: "pending",
    invited_email: member.invited_email,
    pet_name: pet?.name ?? "your pet",
    pet_species: pet?.species ?? "other",
  });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!TOKEN_REGEX.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceSupabase();

  const { data: member } = await db
    .from("pet_members")
    .select("id, pet_id, invited_email, status, invite_token_expires_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (member.status === "revoked") return NextResponse.json({ error: "revoked" }, { status: 410 });
  if (member.status === "accepted") return NextResponse.json({ error: "already_accepted" }, { status: 409 });
  if (new Date(member.invite_token_expires_at) < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Verify the logged-in user's email matches the invite
  const { data: profile } = await db
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  const userEmail = profile?.email ?? user.email ?? "";
  if (userEmail.toLowerCase() !== member.invited_email.toLowerCase()) {
    return NextResponse.json({ error: "email_mismatch", invited_email: member.invited_email }, { status: 403 });
  }

  const { error } = await db
    .from("pet_members")
    .update({
      status: "accepted",
      user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (error) {
    log.error("[invite/accept] update error:", error.message);
    return NextResponse.json({ error: "Failed to accept" }, { status: 500 });
  }

  // Return pet_id so the client can redirect to the pet dashboard
  return NextResponse.json({ success: true, pet_id: member.pet_id });
}
