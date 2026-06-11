import { getServiceSupabase } from "@/lib/plan";

export async function getProfileLocale(email: string): Promise<"en" | "fr"> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("email", email)
      .single();
    if (data?.language?.startsWith("en")) return "en";
  } catch {}
  return "fr";
}

export async function getProfileLocaleById(userId: string): Promise<"en" | "fr"> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", userId)
      .single();
    if (data?.language?.startsWith("en")) return "en";
  } catch {}
  return "fr";
}
