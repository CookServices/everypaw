import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

let session: ReturnType<typeof createSupabaseStub>;
let service: ReturnType<typeof createSupabaseStub>;
let user: { id: string } | null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    ...session.client,
    auth: { getUser: async () => ({ data: { user } }) },
  }),
}));
vi.mock("@/lib/supabase/service", () => ({ getServiceSupabase: () => service.client }));

import { POST } from "./route";

const PET = "11111111-1111-4111-8111-111111111111";

function post(body: unknown) {
  return new Request("http://localhost/api/events/book-preview", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  session = createSupabaseStub();
  service = createSupabaseStub();
  user = { id: "user_1" };
});

it("records the event for a pet the caller owns", async () => {
  session.queueRead({ data: { id: PET } });

  const res = await POST(post({ petId: PET }));

  expect(res.status).toBe(200);
  expect(service.inserts).toEqual([{
    table: "events_log",
    row: { user_id: "user_1", pet_id: PET, event_type: "book_preview_opened" },
  }]);
});

it("scopes the ownership lookup to the caller", async () => {
  // The stub answers from a queue whatever the filters say, so the filter has
  // to be asserted directly: without it any signed-in user could claim a pet.
  session.queueRead({ data: { id: PET } });

  await POST(post({ petId: PET }));

  const lookup = session.queries.find(q => q.table === "pets");
  expect(lookup?.filters).toContainEqual({ method: "eq", args: ["user_id", "user_1"] });
});

it("rejects an anonymous caller", async () => {
  user = null;

  const res = await POST(post({ petId: PET }));

  expect(res.status).toBe(401);
  expect(service.inserts).toHaveLength(0);
});

it("rejects a petId that is not a uuid", async () => {
  const res = await POST(post({ petId: "not-a-uuid" }));

  expect(res.status).toBe(400);
  expect(service.inserts).toHaveLength(0);
});

it("rejects a body without a petId", async () => {
  const res = await POST(post({}));

  expect(res.status).toBe(400);
  expect(service.inserts).toHaveLength(0);
});

it("answers 404 when the pet is not the caller's", async () => {
  session.queueRead({ data: null });

  const res = await POST(post({ petId: PET }));

  expect(res.status).toBe(404);
  expect(service.inserts).toHaveLength(0);
});

it("treats a repeat opening as success, not as an error", async () => {
  // events_log is UNIQUE (user_id, pet_id, event_type): the second opening
  // collides by design and must not surface as a failure.
  session.queueRead({ data: { id: PET } });
  service.queueRead({ error: { code: "23505", message: "duplicate key" } });

  const res = await POST(post({ petId: PET }));

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ recorded: true });
});

it("reports a genuine write failure", async () => {
  session.queueRead({ data: { id: PET } });
  service.queueRead({ error: { code: "42501", message: "permission denied" } });

  const res = await POST(post({ petId: PET }));

  expect(res.status).toBe(500);
});
