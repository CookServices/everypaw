/**
 * Single entry point for Anthropic Messages API calls.
 * Centralizes model id, API version, timeout and retry so the 4 call sites
 * (generate, generate-origins, story.ts ×2) stay consistent.
 */

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_TIMEOUT_MS = 30_000;

export class AnthropicError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AnthropicError";
    this.status = status;
  }
}

interface CallOptions {
  prompt: string;
  maxTokens: number;
  timeoutMs?: number;
}

async function postOnce(opts: CallOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicError("ANTHROPIC_API_KEY missing", 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens,
        messages: [{ role: "user", content: opts.prompt }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AnthropicError(
      `Anthropic API error: ${JSON.stringify(data?.error ?? data)}`,
      response.status,
    );
  }

  return data?.content?.[0]?.text ?? "";
}

/**
 * Calls Claude and returns the raw text of the first content block.
 * Retries once on timeout/network error or a 429/5xx response.
 * Throws AnthropicError on definitive failure.
 */
export async function callClaude(opts: CallOptions): Promise<string> {
  try {
    return await postOnce(opts);
  } catch (err) {
    const retryable =
      (err instanceof AnthropicError && (err.status === 429 || err.status >= 500)) ||
      (err instanceof Error && err.name === "AbortError") ||
      (err instanceof TypeError); // fetch network failure
    if (!retryable) throw err;
    return await postOnce(opts);
  }
}

/**
 * Extracts the `{title, story}` JSON object from a Claude response.
 * Does NOT strip em dashes — callers apply `stripEmDash` so this module
 * stays free of the story dependency.
 */
export function parseStoryResponse(text: string): { title: string; story: string } {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new AnthropicError(`No JSON in Anthropic response: ${text.slice(0, 200)}`, 502);
  }
  return JSON.parse(jsonMatch[0]) as { title: string; story: string };
}
