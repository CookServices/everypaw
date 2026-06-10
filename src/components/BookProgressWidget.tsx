"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calcPageCount } from "@/lib/book";
import { useLocale } from "@/hooks/useLocale";
import type { Plan } from "@/lib/plan";
import type { Pet } from "@/types";

interface Props {
  pet: Pet;
  plan: Plan;
  refreshKey?: number;
}

const BOOK_TARGET = 28;

export default function BookProgressWidget({ pet, plan, refreshKey = 0 }: Props) {
  const { t, locale } = useLocale();
  const bw = t.book_widget;
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  const [pages, setPages] = useState<number | null>(null);
  const [storiesCount, setStoriesCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ count: stCount }, { data: photoEntries }] = await Promise.all([
        supabase
          .from("stories")
          .select("*", { count: "exact", head: true })
          .eq("pet_id", pet.id)
          .neq("status", "draft"),
        supabase
          .from("entries")
          .select("photo_urls")
          .eq("pet_id", pet.id)
          .not("photo_urls", "is", null),
      ]);
      const sc = stCount ?? 0;
      const hasOrphanPhotos = (photoEntries ?? []).some(
        (e: { photo_urls: string[] | null }) => Array.isArray(e.photo_urls) && e.photo_urls.length > 0,
      );
      setStoriesCount(sc);
      setPages(calcPageCount(sc, hasOrphanPhotos, false));
    };
    load();
  }, [pet.id, refreshKey]);

  const isMemorial = !!pet.deceased_at;
  const pagesVal = pages ?? 0;
  const isReady = pagesVal >= BOOK_TARGET;
  const progressPct = Math.min(pagesVal / BOOK_TARGET, 1);
  const monthName = new Date().toLocaleDateString(dateLocale, { month: "long" });

  const title = isMemorial
    ? bw.title_memorial.replace("{petName}", pet.name)
    : bw.title.replace("{petName}", pet.name);

  return (
    <div
      style={{
        background: "#FDFAF5",
        borderRadius: 16,
        border: "1px solid rgba(61,43,31,.07)",
        boxShadow: "0 2px 8px rgba(61,43,31,.06)",
        padding: "1rem 1.1rem",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
      }}
    >
      {/* Mini book cover */}
      <div
        aria-hidden
        style={{
          width: 56,
          minHeight: 72,
          borderRadius: 6,
          background: pet.photo_url
            ? `linear-gradient(rgba(61,43,31,.15),rgba(61,43,31,.15)), url(${encodeURI(pet.photo_url)}) center/cover`
            : "#EDE5D4",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.6rem",
          boxShadow: "2px 2px 8px rgba(61,43,31,.14)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {!pet.photo_url && "🐾"}
        {/* Spine line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: "rgba(61,43,31,.18)",
            borderRadius: "6px 0 0 6px",
          }}
        />
      </div>

      {/* Info block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontSize: ".88rem",
            fontWeight: 600,
            color: "#3D2B1F",
            margin: "0 0 .2rem",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </p>

        {/* Status — not shown for memorial */}
        {!isMemorial && pages !== null && (
          <p style={{ fontSize: ".7rem", color: "#7A5C44", margin: "0 0 .6rem", fontWeight: 300, lineHeight: 1.4 }}>
            {bw.pages_status
              .replace("{pages}", String(pagesVal))
              .replace("{chapters}", String(storiesCount))
              .replace("{month}", monthName)}
          </p>
        )}

        {/* Progress bar — not for memorial */}
        {!isMemorial && pages !== null && (
          <>
            <div
              style={{
                height: 5,
                borderRadius: 100,
                background: "#EDE5D4",
                overflow: "hidden",
                marginBottom: ".35rem",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 100,
                  background: "#C8813A",
                  width: `${progressPct * 100}%`,
                  transition: "width .5s ease",
                }}
              />
            </div>
            <p
              style={{
                fontSize: ".68rem",
                color: isReady ? "#C8813A" : "#9A8070",
                margin: "0 0 .65rem",
                fontWeight: 300,
              }}
            >
              {isReady
                ? bw.progress_ready
                : bw.progress_incomplete
                    .replace("{remaining}", String(BOOK_TARGET - pagesVal))}
            </p>
          </>
        )}

        {/* Memorial: subtle tone, no progress */}
        {isMemorial && (
          <p style={{ fontSize: ".72rem", color: "#9A8070", margin: "0 0 .65rem", fontWeight: 300, fontStyle: "italic" }}>
            {storiesCount} {locale === "fr" ? "chapitres" : "chapters"}
          </p>
        )}

        {/* CTA */}
        {plan === "print" ? (
          <Link
            href={`/dashboard/pets/${pet.id}/order`}
            style={{
              display: "inline-block",
              background: "#C8813A",
              color: "#FDFAF5",
              padding: ".3rem .8rem",
              borderRadius: 100,
              textDecoration: "none",
              fontSize: ".75rem",
              fontWeight: 500,
            }}
          >
            {bw.cta_print}
          </Link>
        ) : plan === "digital" ? (
          <Link
            href={`/dashboard/pets/${pet.id}/order`}
            style={{ fontSize: ".75rem", color: "#C8813A", textDecoration: "none", fontWeight: 400 }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.textDecoration = "underline")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.textDecoration = "none")}
          >
            {bw.cta_digital}
          </Link>
        ) : (
          <p style={{ fontSize: ".72rem", color: "#9A8070", margin: 0 }}>
            {bw.cta_free_prefix}{" "}
            <Link href="/dashboard/settings" style={{ color: "#C8813A", textDecoration: "none" }}>
              {bw.cta_free_plan}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
