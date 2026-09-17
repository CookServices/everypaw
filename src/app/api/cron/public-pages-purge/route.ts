import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { verifyCronRoute } from "@/lib/auth";
import { selectOrphanPhotoNames, photoObjectName } from "@/lib/public-page";
import { log } from "@/lib/log";

/**
 * Deletes what a page created without an account leaves behind once nobody has
 * claimed it (docs/acquisition/specs.md, PP-5).
 *
 * An unclaimed page holds a pet's name, three memories, a photo and a hashed
 * IP, with no account attached and nobody to ask for its removal. Thirty days
 * is enough to decide; past that, keeping it is a liability with no product
 * value. A claimed page never expires: claiming moves its status away from
 * 'active' and this route only ever touches 'active' rows.
 *
 * Two sweeps, because there are two ways to leave data behind:
 *   1. the expired page itself, and the photo it points at;
 *   2. a photo uploaded through the photo route and then abandoned before the
 *      page was ever submitted. No row references it, so sweep 1 can never
 *      reach it.
 *
 * Sweep 2 is also sweep 1's safety net: if a storage delete fails after its row
 * is gone, the object becomes an orphan and the next run collects it.
 */

const BUCKET = "pet-photos";
const PREFIX = "public";

/** How long an unreferenced object is left alone, in case its page is mid-write. */
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/** One run's ceiling. At 60 uploads a day this is never reached; a backlog drains over days. */
const LIST_LIMIT = 1000;

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();
  const startedAt = Date.now();

  // ── Sweep 1: expired pages that were never claimed ─────────────────────────
  // The filter lives inside the DELETE rather than in a SELECT read first. A
  // visitor who claims their page in the seconds before this runs flips its
  // status, the row stops matching, and they keep it. Reading first and then
  // deleting by id would take it from them.
  const { data: purgedPages, error: pageError } = await supabase
    .from("public_pages")
    .delete()
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString())
    .select("slug, photo_url");

  if (pageError) {
    log.error("[public-pages-purge] page delete failed:", pageError.message);
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }

  const pagesDeleted = purgedPages?.length ?? 0;
  let pagePhotosDeleted = 0;

  const pagePhotoNames = (purgedPages ?? [])
    .map((p) => (p.photo_url ? photoObjectName(p.photo_url) : ""))
    .filter((name) => name.length > 0)
    .map((name) => `${PREFIX}/${name}`);

  if (pagePhotoNames.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(pagePhotoNames);
    if (error) {
      // The rows are already gone, so failing here only leaves objects behind.
      // Sweep 2 collects them on a later run; never fail the whole route for it.
      log.error("[public-pages-purge] page photo delete failed:", error.message);
    } else {
      pagePhotosDeleted = pagePhotoNames.length;
    }
  }

  // ── Sweep 2: photos uploaded and then abandoned ────────────────────────────
  let orphansDeleted = 0;

  const { data: objects, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(PREFIX, { limit: LIST_LIMIT, sortBy: { column: "created_at", order: "asc" } });

  if (listError) {
    log.error("[public-pages-purge] storage list failed:", listError.message);
  } else if (objects && objects.length > 0) {
    const { data: rows, error: refError } = await supabase
      .from("public_pages")
      .select("photo_url")
      .not("photo_url", "is", null);

    if (refError) {
      // Without the reference list every object looks like an orphan. Deleting
      // on a failed read would erase live photos, so this sweep stands down.
      log.error("[public-pages-purge] reference read failed, skipping orphan sweep:", refError.message);
    } else {
      const referenced = new Set(
        (rows ?? []).map((r) => photoObjectName(r.photo_url as string)),
      );
      const cutoff = new Date(startedAt - ORPHAN_GRACE_MS).toISOString();
      const orphans = selectOrphanPhotoNames(objects, referenced, cutoff);

      if (orphans.length > 0) {
        const { error } = await supabase.storage
          .from(BUCKET)
          .remove(orphans.map((name) => `${PREFIX}/${name}`));
        if (error) {
          log.error("[public-pages-purge] orphan delete failed:", error.message);
        } else {
          orphansDeleted = orphans.length;
        }
      }
    }
  }

  log.info(
    `[public-pages-purge] pages=${pagesDeleted} pagePhotos=${pagePhotosDeleted} orphans=${orphansDeleted}`,
  );

  return NextResponse.json({
    pagesDeleted,
    pagePhotosDeleted,
    orphansDeleted,
    durationMs: Date.now() - startedAt,
  });
}
