import { describe, it, expect } from "vitest";
import { evaluateFirstStoryNudge, type FirstStoryNudgeConditions } from "./story";

const base: FirstStoryNudgeConditions = {
  deceasedAt: null,
  plan: "free",
  totalStories: 0,
  entryCount: 3,
  existingStoryCount: 0,
};

describe("evaluateFirstStoryNudge", () => {
  it("false if fewer than 3 entries", () => {
    expect(evaluateFirstStoryNudge({ ...base, entryCount: 2 })).toBe(false);
  });

  it("false if a story already exists for the pet", () => {
    expect(evaluateFirstStoryNudge({ ...base, existingStoryCount: 1 })).toBe(false);
  });

  it("false if the plan can no longer generate", () => {
    expect(evaluateFirstStoryNudge({ ...base, totalStories: 1 })).toBe(false);
  });

  it("false if the pet is deceased", () => {
    expect(evaluateFirstStoryNudge({ ...base, deceasedAt: "2026-01-01" })).toBe(false);
  });

  it("true when every condition is met", () => {
    expect(evaluateFirstStoryNudge(base)).toBe(true);
  });
});
