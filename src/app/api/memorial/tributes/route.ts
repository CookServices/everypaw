import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { sendEmail } from "@/lib/resend";
import { baseLayout, hero, ctaButton, heroSection, paragraph } from "@/lib/email-templates";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";

import { UUID_REGEX } from "@/lib/validation";

// GET /api/memorial/tributes?petId=xxx[&status=pending], owner only for pending/rejected
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const petId = searchParams.get("petId");
  const status = searchParams.get("status") ?? "approved";

  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "invalid_pet_id" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  if (status === "approved") {
    // Public: anyone can read approved tributes. This uses the service role, so RLS
    // is bypassed — approved tributes are intentionally public (memorial page). They
    // only exist for deceased pets since POST rejects non-deceased pets.
    const { data } = await supabase
      .from("memorial_tributes")
      .select("id, author_name, message, created_at")
      .eq("pet_id", petId)
      .eq("status", "approved")
      .order("created_at", { ascending: true });
    return NextResponse.json({ tributes: data ?? [] });
  }

  // Pending/rejected: owner only
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: pet } = await supabase
    .from("pets")
    .select("user_id")
    .eq("id", petId)
    .single();
  if (!pet || pet.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data } = await supabase
    .from("memorial_tributes")
    .select("id, author_name, message, status, created_at")
    .eq("pet_id", petId)
    .eq("status", status)
    .order("created_at", { ascending: true });
  return NextResponse.json({ tributes: data ?? [] });
}

// POST /api/memorial/tributes, public submission
export async function POST(req: Request) {
  // Rate limit: 3 per hour per IP
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimitDb(`tribute_submit_${ip}`, 3, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { petId?: string; authorName?: string; message?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: silent reject if filled
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const { petId, authorName, message } = body;

  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "invalid_pet_id" }, { status: 400 });
  }
  if (!authorName || typeof authorName !== "string" || authorName.trim().length < 1 || authorName.trim().length > 100) {
    return NextResponse.json({ error: "invalid_author_name" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim().length < 1 || message.trim().length > 1000) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // Verify pet is deceased and exists
  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, user_id, deceased_at")
    .eq("id", petId)
    .single();

  if (!pet || !pet.deceased_at) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const sanitizedName = escapeHtml(authorName.trim());
  const sanitizedMessage = escapeHtml(message.trim());

  const { error: insertError } = await supabase
    .from("memorial_tributes")
    .insert({
      pet_id: petId,
      author_name: sanitizedName,
      message: sanitizedMessage,
      status: "pending",
    });

  if (insertError) {
    log.error("[memorial/tributes] insert error:", insertError.message);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Notify owner, max 1 email per 24h per pet
  try {
    const eventKey = `memorial_tribute_notif_${petId}`;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentNotif } = await supabase
      .from("events_log")
      .select("id")
      .eq("event_type", "memorial_tribute_notif")
      .contains("metadata", { pet_id: petId })
      .gte("created_at", oneDayAgo)
      .limit(1)
      .maybeSingle();

    if (!recentNotif) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, language")
        .eq("id", pet.user_id)
        .single();

      if (profile?.email) {
        const locale = (profile.language ?? "en").toLowerCase();
        const isFR = locale.startsWith("fr");
        const petNameEsc = escapeHtml(pet.name);

        const subject = isFR
          ? `🕊️ Quelqu'un a laissé un hommage pour ${petNameEsc}`
          : `🕊️ Someone left a tribute for ${petNameEsc}`;

        const tributesUrl = `https://everypaw.app/dashboard/pets/${pet.id}?tab=tributes`;
        const html = baseLayout(
          isFR
            ? hero({ illustration: "plant", emoji: "🕊️", heading: `Un hommage a été déposé pour ${petNameEsc}` }) +
              paragraph(`Quelqu'un a souhaité partager un souvenir ou un message sur la page mémorial de ${petNameEsc}. Vous pouvez l'approuver ou le rejeter depuis le tableau de bord.`) +
              ctaButton(tributesUrl, "Voir les hommages")
            : hero({ illustration: "plant", emoji: "🕊️", heading: `A tribute was left for ${petNameEsc}` }) +
              paragraph(`Someone shared a memory or message on ${petNameEsc}'s memorial page. You can approve or reject it from your dashboard.`) +
              ctaButton(tributesUrl, "Review tributes"),
          "",
          isFR ? "fr" : "en",
          isFR
            ? "Un message vous attend sur la page mémorial."
            : "A message is waiting on the memorial page.",
        );

        await sendEmail({
          from: "Everypaw <hello@everypaw.app>",
          to: profile.email,
          subject,
          html,
        });

        await supabase.from("events_log").insert({
          user_id: pet.user_id,
          event_type: "memorial_tribute_notif",
          metadata: { pet_id: petId },
        });
      }
    }
  } catch (err) {
    log.error("[memorial/tributes] notification error:", err);
    // Non-fatal
  }

  return NextResponse.json({ ok: true });
}
