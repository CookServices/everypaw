/** Shared input validation primitives. Single source of truth so routes don't
 *  each redefine (and subtly diverge on) the same regexes. */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_REGEX.test(value);
}

/** True for in-app redirect targets: a path rooted at "/" but not "//" (which the
 *  browser treats as a protocol-relative absolute URL). Blocks open redirects. */
export function isSafeRelativePath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}
