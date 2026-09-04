/**
 * The birthday email, and the book it now points at (spec P2-2).
 *
 * A pet whose year is already written has the makings of a book, and the
 * birthday is the day that is worth saying. Which call to action appears
 * depends on what the reader can actually do today: order, or find out what
 * Print is. A pet with no chapter is offered nothing, because there would be
 * nothing to bind.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

const sendEmail = vi.fn(async (..._a: unknown[]) => ({ error: null }));
vi.mock("@/lib/resend", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

// The letter itself is not what this file is about, and generating one calls a model.
const generateLetter = vi.fn(async () => null);
vi.mock("@/lib/story", () => ({ generateAndSaveBirthdayLetter: (...a: unknown[]) => generateLetter(...(a as [])) }));

let db: ReturnType<typeof createSupabaseStub>;
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

import { GET } from "./route";

const SECRET = "x".repeat(40);
const PET_ID = "eeee0002-0005-0005-0005-000000000002";

function get(auth = `Bearer ${SECRET}`) {
  return new Request("https://everypaw.app/api/cron/birthday-check", {
    headers: { authorization: auth },
  });
}

/** Reads in order: pets, profiles, chapter count, then the birthday letter. */
function queueBirthday(opts: {
  plan?: string;
  bookCredits?: number;
  language?: string;
  chapters?: number;
}) {
  db.queueRead({ data: [{
    id: PET_ID, user_id: "user_1", name: "Coco", species: "dog",
    bio: null, birthdate: "2020-09-03", photo_url: null,
  }] });
  db.queueRead({ data: [{
    id: "user_1", email: "owner@example.com", language: opts.language ?? "en",
    unsubscribe_token: "tok", plan: opts.plan ?? "free", book_credits: opts.bookCredits ?? 0,
  }] });
  db.queueRead({ data: Array.from({ length: opts.chapters ?? 0 }, () => ({ pet_id: PET_ID })) });
  // A letter already exists, so nothing is generated for these cases.
  db.queueRead({ data: { id: "story_b", content: "Cher humain, cette année…" } });
}

function emailHtml(): string {
  return (sendEmail.mock.calls[0][0] as { html: string }).html;
}

beforeEach(() => {
  db = createSupabaseStub();
  sendEmail.mockClear();
  generateLetter.mockClear();
  vi.stubEnv("CRON_SECRET", SECRET);
});

describe("access", () => {
  it("refuses a caller without the cron secret", async () => {
    const res = await GET(get("Bearer wrong"));

    expect(res.status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("the call to action follows what the reader can do", () => {
  it("offers to order when a Print subscriber holds a credit", async () => {
    queueBirthday({ plan: "print", bookCredits: 1, chapters: 3 });

    await GET(get());

    const html = emailHtml();
    expect(html).toContain("Order their book");
    expect(html).toContain(`/dashboard/pets/${PET_ID}/order`);
    expect(html).not.toContain("See the Print plan");
  });

  it("offers the plan to a Print subscriber whose credit is spent", async () => {
    queueBirthday({ plan: "print", bookCredits: 0, chapters: 3 });

    await GET(get());

    const html = emailHtml();
    expect(html).toContain("See the Print plan");
    expect(html).toContain("/dashboard/settings");
  });

  it("offers the plan to a Digital subscriber", async () => {
    queueBirthday({ plan: "digital", bookCredits: 0, chapters: 5 });

    await GET(get());

    expect(emailHtml()).toContain("See the Print plan");
  });

  it("speaks French to a French reader", async () => {
    queueBirthday({ plan: "print", bookCredits: 1, chapters: 2, language: "fr" });

    await GET(get());

    const html = emailHtml();
    expect(html).toContain("Commander son livre");
    expect(html).toContain("est déjà un livre");
  });
});

describe("a pet with nothing written yet", () => {
  it("gets the birthday email unchanged, with no book offer", async () => {
    queueBirthday({ plan: "print", bookCredits: 1, chapters: 0 });

    await GET(get());

    const html = emailHtml();
    expect(html).not.toContain("Order their book");
    expect(html).not.toContain("See the Print plan");
    // The email itself still goes out.
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not count the birthday letter this cron writes as a chapter", async () => {
    // The chapter lookup excludes birthday letters: counting the one generated
    // moments later would make every pet qualify.
    queueBirthday({ plan: "print", bookCredits: 1, chapters: 0 });

    await GET(get());

    const lookup = db.queries.find(q =>
      q.table === "stories" && q.filters.some(f => f.method === "or"));
    expect(lookup?.filters).toContainEqual({
      method: "or", args: ["story_type.is.null,story_type.neq.birthday"],
    });
  });
});
