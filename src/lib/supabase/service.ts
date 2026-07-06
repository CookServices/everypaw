import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client (bypasses RLS). No server-only deps, so it can
 *  be imported from any runtime including edge. The key never reaches the client. */
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
