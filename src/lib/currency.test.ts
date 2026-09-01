import { describe, it, expect } from "vitest";
import { formatAmount } from "./currency";

describe("formatAmount", () => {
  it("suffixes the euro symbol in EUR", () => {
    expect(formatAmount("EUR", 28)).toBe("28 €");
  });

  it("prefixes the dollar symbol in USD", () => {
    expect(formatAmount("USD", 28)).toBe("$28");
  });
});
