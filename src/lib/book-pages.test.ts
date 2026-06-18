import { describe, it, expect } from "vitest";
import { calcPageCount } from "./book-pages";

describe("calcPageCount", () => {
  it("enforces the 28-page Gelato minimum", () => {
    expect(calcPageCount(0, false, false)).toBe(28);
    expect(calcPageCount(1, false, false)).toBe(28);
    expect(calcPageCount(10, true, true, true)).toBe(28);
  });

  it("rounds content pages up to a multiple of 4", () => {
    // 30 stories + dedication + orphan + tributes = 33 -> ceil to 36
    expect(calcPageCount(30, true, true, true) % 4).toBe(0);
    expect(calcPageCount(30, true, true, true)).toBe(36);
  });

  it("treats zero stories as one placeholder chapter", () => {
    expect(calcPageCount(0, false, false)).toBe(calcPageCount(1, false, false));
  });

  it("counts optional sections", () => {
    // 40 stories alone -> 40; with all three extras -> 43 -> 44
    expect(calcPageCount(40, false, false)).toBe(40);
    expect(calcPageCount(40, true, true, true)).toBe(44);
  });
});
