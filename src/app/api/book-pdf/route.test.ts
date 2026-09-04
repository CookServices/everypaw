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
import { paginateBook, MAX_PHOTO_PAGES, MILESTONES_PER_PAGE } from "@/lib/book-pages";

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

/** Reads are consumed in Promise.all order: pet, stories, entries, [tributes], milestones. */
function queueData(opts: {
  pet?: unknown;
  stories?: unknown[];
  entries?: unknown[];
  tributes?: unknown[] | null;
  milestones?: unknown[];
} = {}) {
  // "pet" in opts rather than ??, so an explicit null still means "no pet".
  db.queueRead({ data: "pet" in opts ? opts.pet : { id: PET_ID, name: "Coco", birthdate: null } });
  db.queueRead({ data: opts.stories ?? [] });
  db.queueRead({ data: opts.entries ?? [] });
  if (opts.tributes !== undefined) db.queueRead({ data: opts.tributes });
  db.queueRead({ data: opts.milestones ?? [] });
}

const milestone = (id: string, achieved_at = "2026-03-01") => ({ id, title: `Milestone ${id}`, achieved_at });

/** Photos composed into a chapter sit on its first page. */
function photosOfChapter(props: Record<string, unknown>, chapterIndex = 0): unknown[] {
  const pages = props.chapterPages as { chapterIndex: number; pageIndex: number; photos: unknown[] }[];
  return pages.find(p => p.chapterIndex === chapterIndex && p.pageIndex === 0)?.photos ?? [];
}

/** Content pages the document will actually render, blanks excluded. */
function renderedContentPages(props: Record<string, unknown>): number {
  const chapterPages = props.chapterPages as unknown[];
  const milestones = props.milestones as unknown[];
  return (props.hasDedication ? 1 : 0)
    // One entry per physical chapter page: a long chapter takes several.
    + Math.max(chapterPages.length, 1)
    + (props.photoPages as unknown[]).length
    + Math.ceil(milestones.length / MILESTONES_PER_PAGE)
    + ((props.tributes as unknown[] | undefined)?.length ? 1 : 0);
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
    expect(photosOfChapter(documentProps!)).toHaveLength(4);
  });

  it("paginates the photos no chapter claims, two to a page", async () => {
    // No stories at all, so every photo is unclaimed. Was a single page of six
    // before P1-3, which is what left the binding two thirds blank.
    const entries = Array.from({ length: 9 }, (_, i) => entry(`e${i}`, "2026-01-0" + (i + 1)));
    queueData({ stories: [], entries });
    await GET(get());
    const pages = documentProps!.photoPages as string[][];
    expect(pages).toHaveLength(5);          // 9 photos, two per page
    expect(pages[0]).toHaveLength(2);
    expect(pages[4]).toHaveLength(1);       // last page carries the remainder
  });

  it("caps the photo pages, whatever the account holds", async () => {
    const entries = Array.from({ length: 200 }, (_, i) =>
      entry(`e${i}`, "2026-01-01", ["https://x/a.jpg", "https://x/b.jpg"]));
    queueData({ stories: [], entries });
    await GET(get());
    expect(documentProps!.photoPages as string[][]).toHaveLength(MAX_PHOTO_PAGES);
  });

  it("ignores entries without photos", async () => {
    queueData({ stories: [], entries: [entry("e1", "2026-01-01", [])] });
    await GET(get());
    expect(documentProps!.photoPages).toHaveLength(0);
  });

  it("keeps a chapter's own photos out of the photo pages", async () => {
    // Claimed photos are composed inside their chapter; counting them twice
    // would declare more pages to Gelato than the file holds.
    const entries = [entry("e1", "2026-01-10"), entry("e2", "2026-06-10")];
    queueData({ stories: [story(S1, "2026-01-01", "2026-01-31")], entries });
    await GET(get());
    expect(photosOfChapter(documentProps!)).toHaveLength(1);
    expect((documentProps!.photoPages as string[][]).flat()).toEqual(["https://x/a.jpg"]);
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

describe("milestones", () => {
  it("gives the milestones pages of their own, eight to a page", async () => {
    const milestones = Array.from({ length: 12 }, (_, i) => milestone(`m${i}`));
    queueData({ stories: [], entries: [], milestones });
    await GET(get());
    expect(documentProps!.milestones).toHaveLength(12);
    expect(renderedContentPages(documentProps!)).toBe(1 + 2); // placeholder chapter + 2 milestone pages
  });

  it("keeps only the milestones of the requested year", async () => {
    queueData({
      stories: [], entries: [],
      milestones: [milestone("m1", "2025-04-02"), milestone("m2", "2026-04-02")],
    });
    await GET(get({ year: "2026" }));
    expect(documentProps!.milestones).toHaveLength(1);
  });
});

describe("the file matches the order", () => {
  // Gelato refuses a PDF whose page count contradicts the declared count, so
  // this is the invariant the whole of P1-3 has to preserve: content pages plus
  // blanks equal what paginateBook declares, on any composition.
  const compositions = [
    {
      name: "three chapters, forty photos, twelve milestones",
      stories: [story(S1, "2026-01-01", "2026-01-31"), story(S2, "2026-02-01", "2026-02-28"),
                story("aaaa0003-0000-0000-0000-000000000003", "2026-03-01", "2026-03-31")],
      entries: Array.from({ length: 20 }, (_, i) =>
        entry(`e${i}`, "2026-07-01", ["https://x/a.jpg", "https://x/b.jpg"])),
      milestones: Array.from({ length: 12 }, (_, i) => milestone(`m${i}`)),
      params: {} as Record<string, string>,
    },
    {
      name: "a book with nothing in it",
      stories: [], entries: [], milestones: [], params: {},
    },
    {
      name: "one chapter, a dedication and a handful of photos",
      stories: [story(S1, "2026-01-01", "2026-01-31")],
      entries: Array.from({ length: 5 }, (_, i) => entry(`e${i}`, "2026-09-0" + (i + 1))),
      milestones: [milestone("m1")],
      params: { dedication: encodeURIComponent("Pour Coco") },
    },
  ];

  for (const composition of compositions) {
    it(`declares exactly what it renders: ${composition.name}`, async () => {
      db = createSupabaseStub();
      queueData({ stories: composition.stories, entries: composition.entries, milestones: composition.milestones });
      await GET(get(composition.params));

      const content = renderedContentPages(documentProps!);
      const blanks = documentProps!.blankPagesCount as number;
      const declared = paginateBook({
        chapters: (documentProps!.stories as { id: string; content: string }[]).map(story => ({
          contentLength: (story.content ?? "").trim().length,
          layout: "classic",
          photoCount: (documentProps!.chapterPages as { story: { id: string }; photos: unknown[]; pageIndex: number }[])
            .filter(p => p.story.id === story.id && p.pageIndex === 0)
            .reduce((n, p) => n + p.photos.length, 0),
        })),
        orphanPhotoCount: (documentProps!.photoPages as string[][]).flat().length,
        milestoneCount: (documentProps!.milestones as unknown[]).length,
        hasDedication: !!documentProps!.hasDedication,
        hasTributes: !!(documentProps!.tributes as unknown[] | undefined)?.length,
      }).declaredPages;

      expect(blanks).toBeGreaterThanOrEqual(0);
      expect(content + blanks).toBe(declared);
    });
  }

  it("leaves at most three blank pages in the book the spec describes", async () => {
    // 3 chapters + 40 photos + 12 milestones: the acceptance criterion.
    db = createSupabaseStub();
    queueData({
      stories: [story(S1, "2026-01-01", "2026-01-31"), story(S2, "2026-02-01", "2026-02-28"),
                story("aaaa0003-0000-0000-0000-000000000003", "2026-03-01", "2026-03-31")],
      entries: Array.from({ length: 20 }, (_, i) =>
        entry(`e${i}`, "2026-07-01", ["https://x/a.jpg", "https://x/b.jpg"])),
      milestones: Array.from({ length: 12 }, (_, i) => milestone(`m${i}`)),
    });
    await GET(get());

    expect(renderedContentPages(documentProps!)).toBe(25);
    expect(documentProps!.blankPagesCount).toBe(3);
  });
});

describe("one declared page is one physical page", () => {
  // react-pdf splits a Page whose content overflows into two physical pages,
  // which silently breaks the count declared to Gelato: the order is refused
  // and the book credit has already been spent. Found on a real render, where
  // a photo page overflowed its budget by four tenths of a point and turned 24
  // declared pages into 48. `wrap={false}` makes the arithmetic non-critical,
  // so every Page in this route must carry it.
  //
  // Asserted on the source because the renderer is stubbed here: the page
  // components are never invoked, so their props cannot be inspected.
  it("carries wrap={false} on every Page of the route", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./route.tsx", import.meta.url), "utf8");
    const tags = source.match(/<Page[^>]*/g) ?? [];

    expect(tags.length).toBeGreaterThan(5);
    expect(tags.filter(tag => !tag.includes("wrap={false}"))).toEqual([]);
  });
});

describe("a chapter too long for one page", () => {
  it("is split, and every page of it is declared", async () => {
    // ~6000 characters: three pages in the text-only layout, one declared each.
    const longStory = {
      ...story(S1, "2026-01-01", "2026-01-31"),
      content: "mot ".repeat(1500).trim(),
    };
    db = createSupabaseStub();
    queueData({ stories: [longStory], entries: [], milestones: [] });

    await GET(get({ layouts: JSON.stringify({ [S1]: "text_only" }) }));

    const pages = documentProps!.chapterPages as { pageIndex: number; text: string; photos: unknown[] }[];
    expect(pages.length).toBeGreaterThan(1);
    // Continuations carry text alone: no photos to repeat under it.
    expect(pages.slice(1).every(p => p.photos.length === 0)).toBe(true);
    // Nothing of the chapter is lost between the pages.
    expect(pages.map(p => p.text).join(" ").split(/\s+/)).toEqual(longStory.content.split(/\s+/));
    expect(renderedContentPages(documentProps!) + (documentProps!.blankPagesCount as number))
      .toBe(paginateBook({
        chapters: [{ contentLength: longStory.content.length, layout: "text_only", photoCount: 0 }],
        orphanPhotoCount: 0, milestoneCount: 0, hasDedication: false, hasTributes: false,
      }).declaredPages);
  });
});
