import { describe, it, expect } from "vitest";
import { buildGiftEmailHtml, giftCopy, giftDeliveryDay } from "./gift-email";
import { htmlToText } from "./email-text";

const NOW = new Date("2026-09-02T10:00:00Z");

describe("giftDeliveryDay", () => {
  it("holds a gift bought for a later day", () => {
    expect(giftDeliveryDay("2026-12-24", NOW)).toBe("2026-12-24");
  });

  it("sends a gift dated today immediately", () => {
    expect(giftDeliveryDay("2026-09-02", NOW)).toBeNull();
  });

  it("sends immediately rather than queueing a date already gone", () => {
    expect(giftDeliveryDay("2026-08-30", NOW)).toBeNull();
  });

  it("ignores an empty or malformed date", () => {
    expect(giftDeliveryDay("", NOW)).toBeNull();
    expect(giftDeliveryDay(null, NOW)).toBeNull();
    expect(giftDeliveryDay("24/12/2026", NOW)).toBeNull();
  });

  it("accepts a date far beyond what a provider would schedule", () => {
    // The whole reason this exists: Resend stops at 30 days, a gift does not.
    expect(giftDeliveryDay("2027-06-01", NOW)).toBe("2027-06-01");
  });
});

describe("buildGiftEmailHtml", () => {
  const base = {
    senderName: "Julien",
    message: "Joyeux anniversaire",
    code: "GIFT-ABC123",
    redeemUrl: "https://everypaw.app/redeem?code=GIFT-ABC123",
  };

  it("carries the code and the redeem link", () => {
    const html = buildGiftEmailHtml({ locale: "fr", ...base });

    expect(html).toContain("GIFT-ABC123");
    expect(html).toContain("https://everypaw.app/redeem?code=GIFT-ABC123");
  });

  it("quotes the buyer's message, escaped", () => {
    const html = buildGiftEmailHtml({ locale: "fr", ...base, message: '<script>alert(1)</script>' });

    expect(html).not.toContain("<script>");
  });

  it("drops the quote block when no message was written", () => {
    const text = htmlToText(buildGiftEmailHtml({ locale: "fr", ...base, message: "" }));

    expect(text).not.toContain("Joyeux anniversaire");
    expect(text).toContain("GIFT-ABC123");
  });

  it("follows the recipient's locale", () => {
    expect(buildGiftEmailHtml({ locale: "en", ...base })).toContain(giftCopy.en.heading);
    expect(buildGiftEmailHtml({ locale: "fr", ...base })).toContain(giftCopy.fr.heading);
  });
});
