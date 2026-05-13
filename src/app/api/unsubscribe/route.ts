import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { token } = await req.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Accept UUID or hex string of at least 32 characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hexRegex = /^[0-9a-f]{32,}$/i;
  if (!uuidRegex.test(token) && !hexRegex.test(token)) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("profiles")
    .update({ email_reminders: false })
    .eq("unsubscribe_token", token);

  if (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
