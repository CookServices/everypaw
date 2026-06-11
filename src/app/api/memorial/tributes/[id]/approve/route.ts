import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const tributeId = params.id;
  if (!UUID_REGEX.test(tributeId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = getServiceSupabase();

  // Fetch tribute + its pet to verify ownership
  const { data: tribute } = await supabase
    .from("memorial_tributes")
    .select("id, pet_id")
    .eq("id", tributeId)
    .single();

  if (!tribute) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: pet } = await supabase
    .from("pets")
    .select("user_id")
    .eq("id", tribute.pet_id)
    .single();

  if (!pet || pet.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("memorial_tributes")
    .update({ status: "approved" })
    .eq("id", tributeId);

  if (error) {
    console.error("[tributes/approve] update error:", error.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
