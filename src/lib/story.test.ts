import { describe, it, expect } from "vitest";
import {
  buildBirthdayLetterPrompt,
  buildOriginsPrompt,
  buildStoryPrompt,
  evaluateFirstStoryNudge,
  type FirstStoryNudgeConditions,
} from "./story";

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

describe("story prompts", () => {
  const pet = { id: "p", name: "Luna", species: "cat", bio: null };
  const entries = [{ entry_date: "2026-10-01", content: "Premier jour à la plage." }];
  const rule = `NEVER call the owner "my human"`;

  it("forbid 'my human' in every prompt", () => {
    expect(buildStoryPrompt(pet, entries, "French")).toContain(rule);
    expect(buildOriginsPrompt(pet, "a", "b", "c", "French")).toContain(rule);
    expect(buildBirthdayLetterPrompt(pet, entries, "French", 3)).toContain(rule);
  });

  it("never call the family 'human' themselves", () => {
    expect(buildBirthdayLetterPrompt(pet, entries, "English", 3)).not.toContain("human family");
  });
});
