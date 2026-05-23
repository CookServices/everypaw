import { createClient } from "@/lib/supabase/server";

export async function getProfileLocale(email: string): Promise<"en" | "fr"> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("locale, language")
      .eq("email", email)
      .single();
    if (data?.locale?.startsWith("en") || data?.language?.startsWith("en")) return "en";
  } catch {}
  return "fr";
}

export async function getProfileLocaleById(userId: string): Promise<"en" | "fr"> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("locale, language")
      .eq("id", userId)
      .single();
    if (data?.locale?.startsWith("en") || data?.language?.startsWith("en")) return "en";
  } catch {}
  return "fr";
}
