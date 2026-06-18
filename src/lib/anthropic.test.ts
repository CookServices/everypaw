import { describe, it, expect } from "vitest";
import { parseStoryResponse, AnthropicError } from "./anthropic";

describe("parseStoryResponse", () => {
  it("extracts a clean JSON object", () => {
    const out = parseStoryResponse('{"title":"Spring","story":"Once upon a time."}');
    expect(out).toEqual({ title: "Spring", story: "Once upon a time." });
  });

  it("extracts JSON wrapped in surrounding prose", () => {
    const out = parseStoryResponse('Here you go:\n{"title":"T","story":"S"}\nThanks!');
    expect(out.title).toBe("T");
    expect(out.story).toBe("S");
  });

  it("throws AnthropicError when no JSON is present", () => {
    expect(() => parseStoryResponse("no json here")).toThrow(AnthropicError);
  });
});
