import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_DRAFTS = 15;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_THEMES = ["classic", "noir", "forest", "ocean", "rose"];
const VALID_STATUSES = ["draft", "ordered"];
const VALID_LAYOUTS = ["classic", "photo_hero", "split", "text_only"];

// GET /api/book-configs?petId=xxx
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const petId = new URL(req.url).searchParams.get("petId");
  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("book_configs")
    .select("*")
    .eq("user_id", user.id)
    .eq("pet_id", petId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configs: data ?? [] });
}

// POST /api/book-configs, create or update (pass id to update)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const {
    id,
    pet_id,
    name,
    status,
    theme,
    custom_title,
    year_filter,
    selected_story_ids,
    cover_photo_url,
    story_layouts,
    dedication_text,
    gelato_order_id,
    ordered_at,
    page_count,
  } = body;

  if (!pet_id || !UUID_REGEX.test(pet_id)) {
    return NextResponse.json({ error: "Invalid pet_id" }, { status: 400 });
  }
  if (id && !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (theme && !VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  // Enforce draft limit (only on create, not update)
  if (!id) {
    const { count } = await supabase
      .from("book_configs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "draft");

    if ((count ?? 0) >= MAX_DRAFTS) {
      return NextResponse.json({ error: "draft_limit_reached" }, { status: 403 });
    }
  }

  const payload = {
    user_id: user.id,
    pet_id,
    name: (name ?? "").slice(0, 100),
    status: status ?? "draft",
    theme: theme ?? "classic",
    custom_title: custom_title ? String(custom_title).slice(0, 60) : null,
    year_filter: year_filter && Number(year_filter) >= 2000 && Number(year_filter) <= 2100 ? Number(year_filter) : null,
    selected_story_ids: Array.isArray(selected_story_ids)
      ? selected_story_ids.filter((sid: unknown) => typeof sid === "string" && UUID_REGEX.test(sid))
      : [],
    cover_photo_url: cover_photo_url && typeof cover_photo_url === "string" && cover_photo_url.startsWith("https://")
      ? cover_photo_url
      : null,
    story_layouts: (story_layouts && typeof story_layouts === "object" && !Array.isArray(story_layouts))
      ? Object.fromEntries(
          Object.entries(story_layouts as Record<string, unknown>)
            .filter(([k, v]) => UUID_REGEX.test(k) && VALID_LAYOUTS.includes(v as string))
        )
      : {},
    dedication_text: dedication_text ? String(dedication_text).slice(0, 500) : null,
    gelato_order_id: gelato_order_id ? String(gelato_order_id) : null,
    ordered_at: ordered_at ?? null,
    page_count: page_count ? Number(page_count) : null,
  };

  if (id) {
    // Update, verify ownership
    const { data, error } = await supabase
      .from("book_configs")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data });
  }

  const { data, error } = await supabase
    .from("book_configs")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data }, { status: 201 });
}
