import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client (bypasses RLS). No server-only deps, so it can
 *  be imported from any runtime including edge. The key never reaches the client. */
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Name the missing variable: supabase-js otherwise throws a generic
  // "supabaseKey is required", which surfaces as an opaque 500 and is easy to
  // mistake for an application bug. Missing on Preview but set on Production is
  // the common case.
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(", ")}. ` +
      `Service-role Supabase calls cannot run. Check the environment scope (Preview vs Production).`
    );
  }

  return createClient(url!, serviceKey!);
}
