import { describe, it, expect } from "vitest";
import { resolveLocale, resolveAcceptLanguage, promptLanguage } from "./resolve-locale";

describe("resolveLocale", () => {
  it.each([
    [null, "en"],
    [undefined, "en"],
    ["", "en"],
    ["fr", "fr"],
    ["fr-FR", "fr"],
    ["FR", "fr"],
    ["en", "en"],
    ["en-US", "en"],
    ["de", "en"],
  ] as const)("%s resolves to %s", (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});

describe("resolveAcceptLanguage", () => {
  it("reads the first tag only", () => {
    expect(resolveAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(resolveAcceptLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
  });

  it("falls back on English without a header", () => {
    expect(resolveAcceptLanguage(null)).toBe("en");
    expect(resolveAcceptLanguage("")).toBe("en");
    expect(resolveAcceptLanguage("*")).toBe("en");
  });
});

describe("promptLanguage", () => {
  it("names the language for the prompts", () => {
    expect(promptLanguage("fr")).toBe("French");
    expect(promptLanguage("en")).toBe("English");
  });
});
