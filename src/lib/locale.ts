import { getServiceSupabase } from "@/lib/plan";
import { resolveLocale, type AppLocale } from "@/lib/resolve-locale";

export async function getProfileLocale(email: string): Promise<AppLocale> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("email", email)
      .single();
    return resolveLocale(data?.language);
  } catch {}
  return resolveLocale(null);
}

export async function getProfileLocaleById(userId: string): Promise<AppLocale> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", userId)
      .single();
    return resolveLocale(data?.language);
  } catch {}
  return resolveLocale(null);
}
