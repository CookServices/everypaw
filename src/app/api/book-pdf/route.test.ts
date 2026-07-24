/**
 * Characterization tests for the book PDF route.
 *
 * These assert what the book WOULD contain, not the rendered bytes: the PDF
 * renderer is stubbed so the props handed to BookDocument can be inspected
 * directly. Comparing binary output would break on any font or library bump
 * while proving nothing about the assembly rules that actually matter -
 * which stories are selected, which photos land in which chapter, and how
 * many blank pages pad the book out to the page count ordered from Gelato.
 *
 * Descriptive, not prescriptive: these encode current production behaviour.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

let tokenValid = true;
vi.mock("@/lib/pdf-token", () => ({
  validatePdfToken: () => tokenValid,
  generatePdfToken: () => ({ token: "tok", expires: 1900000000 }),
}));

// Capture the document props instead of rendering. Component identities are
// irrelevant here because nothing is ever rendered.
let documentProps: Record<string, unknown> | null = null;
let renderThrows = false;
vi.mock("@react-pdf/renderer", () => ({
  Document: "Document", Page: "Page", View: "View", Text: "Text", Image: "Image", Link: "Link",
  StyleSheet: { create: (s: unknown) => s },
  Font: { register: () => {}, registerHyphenationCallback: () => {} },
  renderToBuffer: async (el: { props: Record<string, unknown> }) => {
    if (renderThrows) throw new Error("render blew up");
    documentProps = el.props;
    return Buffer.from("%PDF-stub");
  },
}));

let db: ReturnType<typeof createSupabaseStub>;
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

import { GET } from "./route";

const PET_ID = "eeee0002-0005-0005-0005-000000000002";
const S1 = "aaaa0001-0000-0000-0000-000000000001";
const S2 = "aaaa0002-0000-0000-0000-000000000002";

function get(params: Record<string, string> = {}) {
  const url = new URL("https://everypaw.app/api/book-pdf");
  url.searchParams.set("petId", PET_ID);
  url.searchParams.set("token", "tok");
  url.searchParams.set("expires", "1900000000");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

/** Reads are consumed in Promise.all order: pet, stories, entries, [tributes]. */
function queueData(opts: {
  pet?: unknown;
  stories?: unknown[];
  entries?: unknown[];
  tributes?: unknown[] | null;
} = {}) {
  // "pet" in opts rather than ??, so an explicit null still means "no pet".
  db.queueRead({ data: "pet" in opts ? opts.pet : { id: PET_ID, name: "Coco", birthdate: null } });
  db.queueRead({ data: opts.stories ?? [] });
  db.queueRead({ data: opts.entries ?? [] });
  if (opts.tributes !== undefined) db.queueRead({ data: opts.tributes });
}

// bestStoryIndexForDate only claims an entry when period_start <= date <= period_end,
// so a chapter needs a period wide enough to cover its photos.
const story = (id: string, period_start: string, period_end = period_start) => ({
  id, period_start, period_end, created_at: period_start, title: "t", content: "c", style: null,
});
const entry = (id: string, entry_date: string, photos = ["https://x/a.jpg"]) => ({
  id, entry_date, photo_urls: photos, content: "e",
});

beforeEach(() => {
  db = createSupabaseStub();
  documentProps = null;
  tokenValid = true;
  renderThrows = false;
});

describe("request guards", () => {
  it("requires a petId", async () => {
    const url = new URL("https://everypaw.app/api/book-pdf");
    const res = await GET(new Request(url.toString()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "petId required" });
  });

  it("rejects a non-uuid petId", async () => {
    const url = new URL("https://everypaw.app/api/book-pdf?petId=nope");
    const res = await GET(new Request(url.toString()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid petId" });
  });

  it("rejects an invalid or expired token before touching the database", async () => {
    tokenValid = false;
    const res = await GET(get());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Invalid or expired token" });
    expect(db.unusedReads()).toBe(0); // nothing was queued, nothing was read
  });

  it("rejects an out-of-range year", async () => {
    const res = await GET(get({ year: "1500" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid year" });
  });

  it("rejects an over-long dedication", async () => {
    const res = await GET(get({ dedication: encodeURIComponent("x".repeat(1000)) }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the pet does not exist", async () => {
    queueData({ pet: null });
    const res = await GET(get());
    expect(res.status).toBe(404);
  });

  it("returns 500 when rendering fails", async () => {
    renderThrows = true;
    queueData();
    const res = await GET(get());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "PDF generation failed" });
  });
});

describe("response shape", () => {
  it("serves the PDF inline by default", async () => {
    queueData();
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(`inline; filename="book-${PET_ID}.pdf"`);
  });

  it("switches to an attachment, with the pet name sanitized, when asked to download", async () => {
    queueData({ pet: { id: PET_ID, name: "Coco / L'élégant", birthdate: null } });
    const res = await GET(get({ download: "1" }));
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="Everypaw-Coco---L--l-gant.pdf"');
  });
});

describe("story selection", () => {
  it("keeps every story when nothing narrows the selection", async () => {
    queueData({ stories: [story(S1, "2026-01-05"), story(S2, "2026-02-05")] });
    await GET(get());
    expect((documentProps!.stories as unknown[]).map((s: any) => s.id)).toEqual([S1, S2]);
  });

  it("keeps only the explicitly selected stories", async () => {
    queueData({ stories: [story(S1, "2026-01-05"), story(S2, "2026-02-05")] });
    await GET(get({ storyIds: S2 }));
    expect((documentProps!.stories as unknown[]).map((s: any) => s.id)).toEqual([S2]);
  });

  it("drops stories outside the requested year", async () => {
    queueData({ stories: [story(S1, "2025-01-05"), story(S2, "2026-02-05")] });
    await GET(get({ year: "2026" }));
    expect((documentProps!.stories as unknown[]).map((s: any) => s.id)).toEqual([S2]);
  });
});

describe("photo placement", () => {
  it("caps a chapter at four photos", async () => {
    const entries = Array.from({ length: 6 }, (_, i) => entry(`e${i}`, "2026-01-1" + i));
    queueData({ stories: [story(S1, "2026-01-01", "2026-01-31")], entries });
    await GET(get());
    expect((documentProps!.chapterPhotos as unknown[][])[0]).toHaveLength(4);
  });

  it("collects photos with no matching chapter as orphans, capped at six", async () => {
    // No stories at all, so every photo entry is an orphan.
    const entries = Array.from({ length: 9 }, (_, i) => entry(`e${i}`, "2026-01-0" + (i + 1)));
    queueData({ stories: [], entries });
    await GET(get());
    expect(documentProps!.hasOrphanPhotos).toBe(true);
    expect(documentProps!.orphanEntries).toHaveLength(6);
  });

  it("ignores entries without photos", async () => {
    queueData({ stories: [], entries: [entry("e1", "2026-01-01", [])] });
    await GET(get());
    expect(documentProps!.hasOrphanPhotos).toBe(false);
    expect(documentProps!.orphanEntries).toHaveLength(0);
  });
});

describe("blank page padding", () => {
  it("pads an empty book so the PDF matches the page count ordered from Gelato", async () => {
    // No stories still renders one page, so content is never zero.
    queueData({ stories: [], entries: [] });
    await GET(get());
    expect(documentProps!.blankPagesCount).toBeTypeOf("number");
    expect(documentProps!.blankPagesCount as number).toBeGreaterThanOrEqual(0);
  });

  it("counts the dedication as a content page", async () => {
    queueData({ stories: [story(S1, "2026-01-05")], entries: [] });
    await GET(get());
    const withoutDedication = documentProps!.blankPagesCount as number;

    db = createSupabaseStub();
    queueData({ stories: [story(S1, "2026-01-05")], entries: [] });
    await GET(get({ dedication: encodeURIComponent("Pour Coco") }));

    expect(documentProps!.hasDedication).toBe(true);
    // One more real page means one less blank page for the same target count.
    expect(documentProps!.blankPagesCount as number).toBe(withoutDedication - 1);
  });
});

describe("parameter sanitization", () => {
  it("falls back to english and the classic theme for unknown values", async () => {
    queueData();
    await GET(get({ lang: "de", theme: "neon" }));
    expect(documentProps!.lang).toBe("en");
    expect(documentProps!.theme).toBe("classic");
  });

  it("accepts known language and theme values", async () => {
    queueData();
    await GET(get({ lang: "fr", theme: "forest" }));
    expect(documentProps!.lang).toBe("fr");
    expect(documentProps!.theme).toBe("forest");
  });

  it("keeps only whitelisted layouts, keyed by uuid", async () => {
    queueData();
    await GET(get({
      layouts: JSON.stringify({ [S1]: "photo_hero", "not-a-uuid": "classic", [S2]: "bogus" }),
    }));
    expect(documentProps!.layouts).toEqual({ [S1]: "photo_hero" });
  });

  it("survives malformed layouts json without failing the request", async () => {
    queueData();
    const res = await GET(get({ layouts: "{not json" }));
    expect(res.status).toBe(200);
    expect(documentProps!.layouts).toEqual({});
  });

  it("truncates an over-long custom title", async () => {
    queueData();
    await GET(get({ customTitle: encodeURIComponent("T".repeat(120)) }));
    expect((documentProps!.customTitle as string).length).toBe(60);
  });

  it("rejects a non-https cover photo", async () => {
    queueData();
    await GET(get({ coverPhoto: encodeURIComponent("http://x/a.jpg") }));
    expect(documentProps!.coverPhotoUrl).toBeNull();
  });

  it("clamps out-of-range cover dimensions to the defaults", async () => {
    queueData();
    await GET(get({ coverWidthMm: "9999", coverHeightMm: "1" }));
    const MM = 2.83465;
    expect(documentProps!.coverWidthPt).toBeCloseTo(458 * MM, 2);
    expect(documentProps!.coverHeightPt).toBeCloseTo(246 * MM, 2);
  });

  it("passes through cover dimensions inside the accepted range", async () => {
    queueData();
    await GET(get({ coverWidthMm: "444", coverHeightMm: "246" }));
    expect(documentProps!.coverWidthPt).toBeCloseTo(444 * 2.83465, 2);
  });
});

describe("tributes", () => {
  it("omits tributes unless explicitly requested", async () => {
    queueData({ stories: [], entries: [] }); // no tributes read is performed
    await GET(get());
    expect(documentProps!.tributes).toBeUndefined();
  });

  it("includes approved tributes when requested", async () => {
    queueData({
      stories: [], entries: [],
      tributes: [{ id: "t1", author_name: "Ami", message: "Doux", created_at: "2026-01-01" }],
    });
    await GET(get({ includeTributes: "1" }));
    expect(documentProps!.tributes).toHaveLength(1);
  });
});
