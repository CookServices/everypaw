"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!window.gtag) return;
    const url = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    window.gtag("event", "page_view", {
      page_path: url,
      send_to: measurementId,
    });
  }, [pathname, searchParams, measurementId]);

  return null;
}
