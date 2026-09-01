/** @type {import('next').NextConfig} */

// `next dev` compiles with eval (react-refresh and HMR), which the CSP below
// blocks. The symptom is silent and misleading: the server serves 200s, the
// server-rendered markup looks right, but no client component ever hydrates, so
// the app appears broken locally in ways that look like your own regression.
//
// Development only. In production eval is precisely what this header exists to
// stop, and the string built below is byte-identical to what it was before.
const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://www.googletagmanager.com",
  "https://connect.facebook.net",
].join(" ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.stripe.com https://*.google-analytics.com https://*.analytics.google.com https://*.facebook.com https://*.facebook.net",
      "frame-src https://js.stripe.com https://checkout.stripe.com",
    ].join("; "),
  },
];

const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  async redirects() {
    return [
      { source: "/en", destination: "/", permanent: true },
      { source: "/en/:path*", destination: "/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
