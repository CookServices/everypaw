import Link from "next/link";
import { LEGAL_LAST_UPDATE } from "@/lib/legal";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Terms of Sale · Everypaw",
  description: "Terms of sale for Everypaw: subscription plans and pricing, printed book orders, cancellation and refund policy.",
  alternates: { canonical: "/legal/terms" },
  openGraph: { title: "Terms of Sale · Everypaw", url: "/legal/terms", siteName: "Everypaw", type: "website" },
};

const bodyStyle: React.CSSProperties = {
  fontSize: ".95rem", color: "#7A5C44", lineHeight: 1.75, fontWeight: 300,
};

const sections: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "1. Purpose",
    body: "These Terms of Sale govern the contractual relationship between Everypaw and its customers in connection with Premium subscription plans and printed book orders.",
  },
  {
    title: "2. Pricing",
    body: (
      <>
        <p style={{ ...bodyStyle, margin: "0 0 .75rem" }}>
          Reference prices are displayed in EUR (incl. VAT) or USD depending on your location. Two Premium plans are available:
        </p>
        <ul style={{ margin: "0 0 .75rem", paddingLeft: "1.25rem" }}>
          <li style={{ ...bodyStyle, marginBottom: ".4rem" }}>
            <strong>Premium Digital</strong>: $4.99/month.
          </li>
          <li style={bodyStyle}>
            <strong>Premium Print</strong>: $79/year.
          </li>
        </ul>
        <p style={{ ...bodyStyle, margin: 0 }}>
          The printed book is included in the Premium Print annual plan. On other plans it can be ordered individually; its price is calculated based on the page count and shown before payment.
        </p>
      </>
    ),
  },
  {
    title: "3. Payment",
    body: "Payments are processed securely by Stripe. Everypaw does not store or access your payment details. By subscribing, you authorize automatic recurring charges on your renewal date.",
  },
  {
    title: "4. Cancellation",
    body: "You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. No pro-rata refunds are issued.",
  },
  {
    title: "5. Right of withdrawal",
    body: "If you are based in the European Union, you have a 14-day right of withdrawal from the date of subscription, unless you have expressly waived this right by accessing the service before the end of that period.",
  },
  {
    title: "6. Contact",
    body: "For any questions about an order or your subscription, please contact us at orders@everypaw.app.",
  },
];

export default function Terms() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 2rem 6rem" }}>
        <Link href="/" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>Back</Link>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "2rem 0 .75rem" }}>
          Terms of Sale
        </h1>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: "3rem" }}>Last updated: {LEGAL_LAST_UPDATE}</p>

        {sections.map(({ title, body }) => (
          <section key={title} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>{title}</h2>
            {typeof body === "string" ? (
              <p style={bodyStyle}>{body}</p>
            ) : (
              <div>{body}</div>
            )}
          </section>
        ))}
      </main>

      <PublicFooter variant="minimal" />
    </div>
  );
}
