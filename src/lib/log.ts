/**
 * Lightweight logger. `debug`/`info` are silent unless DEBUG_LOGS=1, so verbose
 * per-request tracing (user ids, payloads) never reaches production logs.
 * `warn`/`error` always emit.
 */
const enabled = process.env.DEBUG_LOGS === "1";

export const log = {
  debug: (...args: unknown[]) => {
    if (enabled) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (enabled) console.info(...args);
  },
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
