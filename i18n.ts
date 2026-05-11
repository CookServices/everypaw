import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();
  
  // Check cookie first (user preference)
  const cookieLocale = cookieStore.get("locale")?.value;
  
  // If no cookie, detect from browser
  let locale = "en";
  if (cookieLocale && ["en", "fr"].includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const acceptLanguage = headersList.get("accept-language") || "";
    if (acceptLanguage.toLowerCase().includes("fr")) {
      locale = "fr";
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
