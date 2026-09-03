import { describe, it, expect } from "vitest";
import { isGiftCampaignActive } from "@/lib/gift-campaign";

/** Local time on purpose: the card follows the reader's calendar, not UTC's. */
const on = (iso: string) => new Date(`${iso}T12:00:00`);

describe("isGiftCampaignActive", () => {
  it("opens on 15 November and not the day before", () => {
    expect(isGiftCampaignActive(on("2026-11-14"))).toBe(false);
    expect(isGiftCampaignActive(on("2026-11-15"))).toBe(true);
  });

  it("closes after 24 December, without anyone deploying", () => {
    expect(isGiftCampaignActive(on("2026-12-24"))).toBe(true);
    expect(isGiftCampaignActive(on("2026-12-25"))).toBe(false);
    expect(isGiftCampaignActive(on("2026-12-31"))).toBe(false);
  });

  it("runs through the whole of December up to Christmas Eve", () => {
    expect(isGiftCampaignActive(on("2026-11-30"))).toBe(true);
    expect(isGiftCampaignActive(on("2026-12-01"))).toBe(true);
    expect(isGiftCampaignActive(on("2026-12-15"))).toBe(true);
  });

  it("stays shut the rest of the year", () => {
    for (const day of ["2026-01-01", "2026-06-15", "2026-09-03", "2026-10-31", "2026-11-01"]) {
      expect(isGiftCampaignActive(on(day))).toBe(false);
    }
  });

  it("comes back the following year with no edit", () => {
    expect(isGiftCampaignActive(on("2027-11-20"))).toBe(true);
    expect(isGiftCampaignActive(on("2030-12-24"))).toBe(true);
  });
});
