"use client";

import { useState, useEffect } from "react";
import { Locale, getTranslations } from "@/lib/i18n";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    if (navigator.language.toLowerCase().startsWith("fr")) {
      setLocaleState("fr");
    }
  }, []);

  const t = getTranslations(locale);

  return { locale, t };
}
