/**
 * Chainable stand-in for the service-role Supabase client, for characterization
 * tests of route handlers. Not a test file itself (vitest only collects
 * *.test.ts), and never imported by application code.
 *
 * Reads are served from a FIFO queue: queue one result per terminal call, in the
 * order the handler under test performs them. Writes are recorded so a test can
 * assert what the handler persisted.
 */

export type StubResult = { data?: unknown; error?: unknown };

export type RecordedInsert = { table: string; row: unknown };
export type RecordedUpdate = { table: string; values: unknown };
export type RecordedRpc = { fn: string; args: unknown };

export function createSupabaseStub() {
  const reads: StubResult[] = [];
  const inserts: RecordedInsert[] = [];
  const updates: RecordedUpdate[] = [];
  const rpcs: RecordedRpc[] = [];
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
    const chain = () => builder;

    for (const m of [
      "select", "eq", "neq", "in", "not", "is", "gte", "lte", "gt", "lt",
      "contains", "order", "limit", "range", "filter", "match",
    ]) {
      builder[m] = chain;
    }

    builder.insert = (row: unknown) => {
      inserts.push({ table, row });
      return builder;
    };
    builder.update = (values: unknown) => {
      updates.push({ table, values });
      return builder;
    };
    builder.delete = () => builder;

    builder.single = async () => {
      if (throwingTables.has(table)) throw new Error(`stub: ${table} read failed`);
      return nextRead();
    };
    builder.maybeSingle = builder.single;

    // Awaiting the chain directly (e.g. `await db.from(t).insert(...)`).
    builder.then = (resolve: (v: StubResult) => unknown, reject?: (e: unknown) => unknown) => {
      if (throwingTables.has(table)) return reject?.(new Error(`stub: ${table} write failed`));
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
    rpcs,
    /** Reads queued but never consumed — a mismatch between test and handler. */
    unusedReads: () => reads.length,
  };

  return api;
}
