/**
 * Chainable stand-in for the service-role Supabase client, for characterization
 * tests of route handlers. Not a test file itself (vitest only collects
 * *.test.ts), and never imported by application code.
 *
 * Reads are served from a FIFO queue: queue one result per terminal call, in the
 * order the handler under test performs them. Writes are recorded so a test can
 * assert what the handler persisted.
 */

// `count` is part of a Supabase response too: a handler that writes with
// `{ count: "exact" }` reads it back to know whether its update matched a row.
export type StubResult = { data?: unknown; error?: unknown; count?: number | null };

export type RecordedInsert = { table: string; row: unknown };
export type RecordedUpdate = { table: string; values: unknown };
export type RecordedUpsert = { table: string; row: unknown };
export type RecordedRpc = { fn: string; args: unknown };
/**
 * A chain as it was awaited: the table plus the filters applied to it. Results
 * come from the FIFO queue whatever the filters say, so this is how a test
 * asserts that a lookup was actually scoped the way it claims to be.
 */
export type RecordedQuery = { table: string; filters: { method: string; args: unknown[] }[] };

export function createSupabaseStub() {
  const reads: StubResult[] = [];
  const inserts: RecordedInsert[] = [];
  const updates: RecordedUpdate[] = [];
  const upserts: RecordedUpsert[] = [];
  const rpcs: RecordedRpc[] = [];
  const queries: RecordedQuery[] = [];
  const rpcResults: StubResult[] = [];
  const throwingTables = new Set<string>();

  /**
   * Make any awaited chain on this table reject. Used to characterize what a
   * handler does when a write fails midway - notably whether it compensates.
   */
  function throwOn(table: string) {
    throwingTables.add(table);
    return api;
  }

  /** Next terminal read resolves to this. Call once per expected read, in order. */
  function queueRead(result: StubResult) {
    reads.push(result);
    return api;
  }

  /** Next rpc() resolves to this. Defaults to success when nothing is queued. */
  function queueRpc(result: StubResult) {
    rpcResults.push(result);
    return api;
  }

  function nextRead(): StubResult {
    return reads.shift() ?? { data: null };
  }

  // Every builder method returns the builder; terminal behaviour comes from
  // `then` (awaiting the chain) or from single()/maybeSingle().
  function makeBuilder(table: string) {
    const builder: Record<string, unknown> = {};
    const filters: { method: string; args: unknown[] }[] = [];
    const chain = () => builder;

    for (const m of [
      "select", "eq", "neq", "in", "not", "is", "gte", "lte", "gt", "lt",
      "contains", "order", "limit", "range", "filter", "match", "or",
    ]) {
      builder[m] = (...args: unknown[]) => {
        filters.push({ method: m, args });
        return builder;
      };
    }

    builder.insert = (row: unknown) => {
      inserts.push({ table, row });
      return builder;
    };
    builder.update = (values: unknown) => {
      updates.push({ table, values });
      return builder;
    };
    // Recorded apart from inserts: a handler that upserts is claiming a row it
    // may already own, which is a different fact to assert on.
    builder.upsert = (row: unknown) => {
      upserts.push({ table, row });
      return builder;
    };
    builder.delete = () => builder;

    builder.single = async () => {
      if (throwingTables.has(table)) throw new Error(`stub: ${table} read failed`);
      queries.push({ table, filters: [...filters] });
      return nextRead();
    };
    builder.maybeSingle = builder.single;

    // Awaiting the chain directly (e.g. `await db.from(t).insert(...)`).
    builder.then = (resolve: (v: StubResult) => unknown, reject?: (e: unknown) => unknown) => {
      if (throwingTables.has(table)) return reject?.(new Error(`stub: ${table} write failed`));
      queries.push({ table, filters: [...filters] });
      return resolve(nextRead());
    };

    return builder;
  }

  const client = {
    from: (table: string) => makeBuilder(table),
    rpc: async (fn: string, args: unknown) => {
      rpcs.push({ fn, args });
      return rpcResults.shift() ?? { data: null, error: null };
    },
  };

  const api = {
    client,
    queueRead,
    queueRpc,
    throwOn,
    inserts,
    updates,
    upserts,
    rpcs,
    queries,
    /** Reads queued but never consumed — a mismatch between test and handler. */
    unusedReads: () => reads.length,
  };

  return api;
}
