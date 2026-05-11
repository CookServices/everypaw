"use client";

import { useState, useEffect } from "react";
import { Locale, getTranslations } from "@/lib/i18n";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const cookie = document.cookie.split(";").find(c => c.trim().startsWith("locale="));
    const cookieLocale = cookie?.split("=")?.[1] as Locale;
    if (cookieLocale && ["en", "fr"].includes(cookieLocale)) {
      setLocaleState(cookieLocale);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("fr")) setLocaleState("fr");
    }
  }, []);

  const setLocale = async (newLocale: Locale) => {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });
    setLocaleState(newLocale);
    window.location.reload();
  };

  const t = getTranslations(locale);

  return { locale, setLocale, t };
}
