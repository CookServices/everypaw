import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceSupabase, canInviteMembers } from "@/lib/plan";
import { getResendClient } from "@/lib/resend";
import { escapeHtml } from "@/lib/html";
import { baseLayout, heading, paragraph, ctaButton, finePrint } from "@/lib/email-templates";
import crypto from "node:crypto";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MEMBERS = 5;
const INVITE_TTL_DAYS = 7;

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const petId = url.searchParams.get("petId");
  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }

  const db = getServiceSupabase();

  // Verify ownership
  const { data: pet } = await db.from("pets").select("id, name, user_id").eq("id", petId).single();
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: members } = await db
    .from("pet_members")
    .select("id, invited_email, user_id, status, role, accepted_at, created_at")
    .eq("pet_id", petId)
    .neq("status", "revoked")
    .order("created_at");

  // Resolve display names for accepted members
  const acceptedUserIds = (members ?? [])
    .filter(m => m.user_id)
    .map(m => m.user_id as string);

  let profileMap: Record<string, string> = {};
  if (acceptedUserIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", acceptedUserIds);
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = p.full_name || p.email || p.id;
      }
    }
  }

  const result = (members ?? []).map(m => ({
    id: m.id,
    invited_email: m.invited_email,
    status: m.status,
    role: m.role,
    display_name: m.user_id ? (profileMap[m.user_id] ?? m.invited_email) : m.invited_email,
    accepted_at: m.accepted_at,
    created_at: m.created_at,
  }));

  return NextResponse.json({ members: result });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { petId, email } = body;

  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Plan check, only digital/print can invite members
  const allowed = await canInviteMembers(user.id);
  if (!allowed) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const db = getServiceSupabase();

  // Verify pet ownership
  const { data: pet } = await db.from("pets").select("id, name, user_id").eq("id", petId).single();
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cannot invite yourself
  const { data: ownerProfile } = await db.from("profiles").select("email").eq("id", user.id).single();
  if (ownerProfile?.email?.toLowerCase() === email.toLowerCase()) {
    return NextResponse.json({ error: "cannot_invite_self" }, { status: 400 });
  }

  // Check member count
  const { count } = await db
    .from("pet_members")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId)
    .neq("status", "revoked");
  if ((count ?? 0) >= MAX_MEMBERS) {
    return NextResponse.json({ error: "member_limit" }, { status: 400 });
  }

  // Check if already invited (pending or accepted)
  const { data: existing } = await db
    .from("pet_members")
    .select("id, status")
    .eq("pet_id", petId)
    .ilike("invited_email", email)
    .neq("status", "revoked")
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "already_member" }, { status: 409 });
    }
    // Re-send invite for pending
    const newToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + INVITE_TTL_DAYS * 86400 * 1000).toISOString();
    await db.from("pet_members").update({
      invite_token: newToken,
      invite_token_expires_at: expires,
    }).eq("id", existing.id);
    await sendInviteEmail(email, newToken, pet.name, ownerProfile?.email ?? "your partner", user.id);
    return NextResponse.json({ success: true, resent: true });
  }

  // Create new invite
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400 * 1000).toISOString();

  const { error: insertError } = await db.from("pet_members").insert({
    pet_id: petId,
    invited_email: email.toLowerCase(),
    invited_by: user.id,
    invite_token: token,
    invite_token_expires_at: expiresAt,
  });

  if (insertError) {
    log.error("[pet-members] insert error:", insertError.message);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  await sendInviteEmail(email, token, pet.name, ownerProfile?.email ?? "your partner", user.id);

  return NextResponse.json({ success: true });
}

async function sendInviteEmail(
  toEmail: string,
  token: string,
  petName: string,
  ownerEmail: string,
  ownerId: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://everypaw.app";
  const inviteUrl = `${appUrl}/invite/${token}`;
  const safeEmail = escapeHtml(ownerEmail);
  const safePet = escapeHtml(petName);

  const db = getServiceSupabase();
  const { data: ownerProfile } = await db.from("profiles").select("language").eq("id", ownerId).single();
  const isFR = (ownerProfile?.language ?? "en").toLowerCase().startsWith("fr");
  const lang: "fr" | "en" = isFR ? "fr" : "en";

  let resend;
  try { resend = getResendClient(); } catch { return; }

  const subject = isFR
    ? `Vous êtes invité(e) à rejoindre le journal de ${petName} sur Everypaw`
    : `You're invited to join ${petName}'s journal on Everypaw`;

  const html = baseLayout(
    isFR
      ? heading(`Vous avez été invité(e) à rejoindre le journal de ${safePet}`) +
        paragraph(`<strong style="color:#3D2B1F">${safeEmail}</strong> vous invite à contribuer au journal Everypaw de <strong style="color:#3D2B1F">${safePet}</strong> — ajoutez des souvenirs, des photos et des moments ensemble.`) +
        ctaButton(inviteUrl, "Accepter l'invitation →") +
        finePrint(`Cette invitation expire dans ${INVITE_TTL_DAYS} jours. Si vous n'attendiez pas cet email, vous pouvez l'ignorer.`)
      : heading(`You've been invited to join ${safePet}'s journal`) +
        paragraph(`<strong style="color:#3D2B1F">${safeEmail}</strong> invited you to contribute to <strong style="color:#3D2B1F">${safePet}'s</strong> Everypaw journal — add memories, photos, and special moments together.`) +
        ctaButton(inviteUrl, "Accept invitation →") +
        finePrint(`This invitation expires in ${INVITE_TTL_DAYS} days. If you didn't expect this email, you can safely ignore it.`),
    "",
    lang,
  );

  try {
    await resend.emails.send({
      from: "Everypaw <hello@everypaw.app>",
      to: toEmail,
      subject,
      html,
    });
  } catch (e) {
    log.error("[pet-members] email send error:", e);
  }
}
