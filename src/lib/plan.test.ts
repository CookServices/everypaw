import { describe, it, expect, beforeEach, vi } from "vitest";

// plan.ts statically imports supabase/server -> next/headers. Stub it so the
// module loads in a plain node test environment; the pure guards below never
// touch it.
vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));

import { canAddEntry, canGenerateStory, canOrderBook, priceIdToPlan } from "./plan";

describe("canAddEntry", () => {
  it("blocks free users at 10 entries", () => {
    expect(canAddEntry("free", 9)).toBeNull();
    expect(canAddEntry("free", 10)).toBe("entry_limit");
  });
  it("never blocks paid plans", () => {
    expect(canAddEntry("digital", 9999)).toBeNull();
    expect(canAddEntry("print", 9999)).toBeNull();
  });
});

describe("canGenerateStory", () => {
  it("blocks free users at their first story", () => {
    expect(canGenerateStory("free", 0)).toBeNull();
    expect(canGenerateStory("free", 1)).toBe("story_limit");
  });
  it("never blocks paid plans", () => {
    expect(canGenerateStory("print", 100)).toBeNull();
  });
});

describe("canOrderBook", () => {
  it("requires upgrade for free", () => {
    expect(canOrderBook("free", 5)).toBe("upgrade_required");
  });
  it("requires credits for paid plans", () => {
    expect(canOrderBook("digital", 0)).toBe("no_book_credits");
    expect(canOrderBook("print", 1)).toBeNull();
  });
});

describe("priceIdToPlan", () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_ID_DIGITAL_EUR = "price_digi_eur";
    process.env.STRIPE_PRICE_PRINT_ANNUAL_USD = "price_print_annual_usd";
  });
  it("maps known price ids", () => {
    expect(priceIdToPlan("price_digi_eur")).toBe("digital");
    expect(priceIdToPlan("price_print_annual_usd")).toBe("print");
  });
  it("returns null for unknown ids", () => {
    expect(priceIdToPlan("price_unknown")).toBeNull();
  });
  it("ignores undefined env entries (never matches empty)", () => {
    expect(priceIdToPlan("")).toBeNull();
  });
});
