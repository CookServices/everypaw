export const runtime = "edge";

import { ImageResponse } from "@vercel/og";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function extractQuote(content: string, maxLen = 200): string {
  const clean = content
    .replace(/\*\*(INTRO|INTRODUCTION|DÉVELOPPEMENT|DEVELOPPEMENT|DEVELOPMENT|CHUTE|CONCLUSION|ENDING)\*\*/gi, "")
    .replace(/\*\*/g, "")
    .trim();
  const paragraphs = clean.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 30);
  const first = paragraphs[0] ?? clean;
  if (first.length <= maxLen) return first;
  const cut = first.lastIndexOf(" ", maxLen);
  return first.slice(0, cut > 0 ? cut : maxLen) + "…";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get("story_id");
  const format = searchParams.get("format") === "story" ? "story" : "square";

  if (!storyId) {
    return new Response(JSON.stringify({ error: "missing story_id" }), { status: 400 });
  }

  // Auth: verify session via cookies
  let userId: string | null = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    userId = user.id;
  } catch {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const service = getServiceSupabase();

  // Ownership check + story fetch
  const { data: story, error: storyErr } = await service
    .from("stories")
    .select("id, title, content, user_id, pet_id")
    .eq("id", storyId)
    .single();

  if (storyErr || !story) {
    return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  }
  if (story.user_id !== userId) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  // Pet photo
  const { data: pet } = await service
    .from("pets")
    .select("name, photo_url")
    .eq("id", story.pet_id)
    .single();

  const quote = extractQuote(story.content);
  const title = story.title ?? (pet?.name ? `${pet.name}'s Story` : "Our Story");

  const width = 1080;
  const height = format === "story" ? 1920 : 1080;

  // Load pet photo as data URL for embedding
  let photoDataUrl: string | null = null;
  if (pet?.photo_url) {
    try {
      const imgRes = await fetch(pet.photo_url);
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer();
        const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        photoDataUrl = `data:${mime};base64,${b64}`;
      }
    } catch { /* photo optional */ }
  }

  const bgColor = "#FAF6F0";
  const brown = "#3D2B1F";
  const amber = "#C8813A";
  const lightBrown = "#9A8070";

  const photoSize = format === "story" ? 320 : 240;
  const quoteFontSize = format === "story" ? 42 : 34;
  const titleFontSize = format === "story" ? 34 : 28;
  const brandFontSize = format === "story" ? 26 : 22;
  const paddingH = format === "story" ? 80 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width,
          height,
          background: bgColor,
          padding: `${format === "story" ? 100 : 64}px ${paddingH}px`,
          fontFamily: "Georgia, serif",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {/* Decorative corner lines */}
        <div style={{ position: "absolute", top: 32, left: 32, width: 48, height: 48, borderTop: `2px solid ${amber}`, borderLeft: `2px solid ${amber}`, borderRadius: 2, display: "flex" }} />
        <div style={{ position: "absolute", top: 32, right: 32, width: 48, height: 48, borderTop: `2px solid ${amber}`, borderRight: `2px solid ${amber}`, borderRadius: 2, display: "flex" }} />
        <div style={{ position: "absolute", bottom: 32, left: 32, width: 48, height: 48, borderBottom: `2px solid ${amber}`, borderLeft: `2px solid ${amber}`, borderRadius: 2, display: "flex" }} />
        <div style={{ position: "absolute", bottom: 32, right: 32, width: 48, height: 48, borderBottom: `2px solid ${amber}`, borderRight: `2px solid ${amber}`, borderRadius: 2, display: "flex" }} />

        {/* Pet photo */}
        {photoDataUrl ? (
          <img
            src={photoDataUrl}
            width={photoSize}
            height={photoSize}
            style={{ borderRadius: photoSize / 2, objectFit: "cover", border: `4px solid ${amber}` }}
          />
        ) : (
          <div style={{
            width: photoSize, height: photoSize,
            borderRadius: photoSize / 2,
            background: "#EDE5D4",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: photoSize * 0.45,
            border: `4px solid ${amber}`,
          }}>
            🐾
          </div>
        )}

        {/* Title */}
        <div style={{
          fontSize: titleFontSize,
          fontWeight: 600,
          color: brown,
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}>
          {title}
        </div>

        {/* Divider */}
        <div style={{
          width: 60,
          height: 2,
          background: amber,
          borderRadius: 2,
          display: "flex",
        }} />

        {/* Quote */}
        <div style={{
          fontSize: quoteFontSize,
          color: brown,
          textAlign: "center",
          lineHeight: 1.65,
          fontStyle: "italic",
          maxWidth: width - paddingH * 2 - 40,
        }}>
          "{quote}"
        </div>

        {/* Branding */}
        <div style={{
          position: "absolute",
          bottom: 56,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: brandFontSize * 0.85, color: lightBrown }}>🐾</span>
          <span style={{ fontSize: brandFontSize, color: lightBrown, fontFamily: "Georgia, serif", letterSpacing: "0.08em" }}>everypaw</span>
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
