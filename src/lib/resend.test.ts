/**
 * The point of routing every send through sendEmail is that no call site can
 * forget the text/plain part or the unsubscribe headers. These lock that in.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

type SendPayload = Record<string, unknown>;
const send = vi.fn(async (_payload: SendPayload) => ({ data: { id: "email_1" }, error: null }));
vi.mock("resend", () => ({ Resend: class { emails = { send: (payload: SendPayload) => send(payload) }; } }));

import { sendEmail } from "./resend";

const base = {
  from: "Everypaw <hello@everypaw.app>",
  to: "someone@example.com",
  subject: "Sujet",
  html: "<p>Bonjour <a href=\"https://everypaw.app/dashboard\">le journal</a></p>",
};

beforeEach(() => send.mockClear());

describe("sendEmail", () => {
  it("always attaches a text alternative derived from the html", async () => {
    await sendEmail(base);

    const payload = send.mock.calls[0][0] as Record<string, string>;
    expect(payload.text).toBe("Bonjour le journal (https://everypaw.app/dashboard)");
  });

  it("adds the one-click unsubscribe headers when the mail is opt-out", async () => {
    await sendEmail({ ...base, unsubscribeUrl: "https://everypaw.app/api/unsubscribe?token=abc" });

    const payload = send.mock.calls[0][0] as Record<string, Record<string, string>>;
    expect(payload.headers).toEqual({
      "List-Unsubscribe": "<https://everypaw.app/api/unsubscribe?token=abc>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("sends no unsubscribe header on transactional mail", async () => {
    await sendEmail(base);

    const payload = send.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.headers).toBeUndefined();
  });

  it("passes replyTo through under the name the SDK expects", async () => {
    await sendEmail({ ...base, replyTo: "julien@example.com" });

    const payload = send.mock.calls[0][0] as Record<string, string>;
    expect(payload.replyTo).toBe("julien@example.com");
  });
});
