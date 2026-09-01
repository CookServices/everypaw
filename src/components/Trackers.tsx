"use client";

import Script from "next/script";
import { Suspense, useEffect, useState } from "react";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

/**
 * GA4 and the Meta Pixel, held back until the visitor accepts. Nothing is
 * injected before that, so no request reaches Google or Meta.
 *
 * This lives client-side because the decision lives in localStorage, which the
 * server cannot read. Rendering null on the server (and on the first client
 * pass) is what keeps the scripts out of the initial HTML.
 */
export default function Trackers({ gaId, pixelId }: { gaId?: string; pixelId?: string }) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const sync = () => setAccepted(readConsent() === "accepted");
    sync();
    // Same tab: our own event. Other tabs: the native storage event.
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!accepted) return null;

  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: false });`}
          </Script>
          <Suspense fallback={null}>
            <GoogleAnalytics measurementId={gaId} />
          </Suspense>
        </>
      )}
      {pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
        </Script>
      )}
    </>
  );
}
