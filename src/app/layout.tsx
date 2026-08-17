import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "AI Pet Journal That Becomes a Printed Book | Everypaw",
  description: "Everypaw is the AI pet journal that turns your daily moments into story chapters, and a printed pet memory book every year. Start free, no credit card.",
  metadataBase: new URL("https://everypaw.app"),
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "AI Pet Journal That Becomes a Printed Book | Everypaw",
    description: "Everypaw is the AI pet journal that turns your daily moments into story chapters, and a printed pet memory book every year. Start free, no credit card.",
    siteName: "Everypaw",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Everypaw, Your pet's life story, printed" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Pet Journal That Becomes a Printed Book | Everypaw",
    description: "Everypaw is the AI pet journal that turns your daily moments into story chapters, and a printed pet memory book every year. Start free, no credit card.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const lang = pathname.startsWith("/fr") ? "fr" : "en";

  return (
    <html lang={lang}>
      <body>
        {META_PIXEL_ID && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
