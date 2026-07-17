import Link from "next/link";
import { LEGAL_LAST_UPDATE_EN } from "@/lib/legal";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Privacy Policy · Everypaw",
  description: "How Everypaw collects, uses, and protects your data: photos, journal entries, payments, and your privacy rights (GDPR).",
  alternates: {
    canonical: "/legal/privacy",
    languages: { en: "/legal/privacy", fr: "/legal/confidentialite", "x-default": "/legal/privacy" },
  },
  openGraph: { title: "Privacy Policy · Everypaw", url: "/legal/privacy", siteName: "Everypaw", type: "website" },
};

export default function Privacy() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" locale="en" />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 2rem 6rem" }}>
        <Link href="/" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>Back</Link>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "2rem 0 .75rem" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: "3rem" }}>Last updated: {LEGAL_LAST_UPDATE_EN}</p>

        {[
          ["1. Data controller", "Everypaw is responsible for processing your personal data. Contact: hello@everypaw.app."],
          ["2. Data collected", "We collect: your email address and password (authentication), your pet's name and profile information, journal entries and photos you publish, payment data processed by Stripe (we do not access it directly), and anonymized usage data for service improvement."],
          ["3. Purposes", "Your data is used to: provide the Everypaw service, generate AI stories and printed books, send service notifications (weekly reminders if enabled), and prevent fraud."],
          ["4. Legal basis", "Processing is based on: contract performance (service delivery), your consent (optional marketing communications), and our legitimate interests (security, service improvement)."],
          ["5. Sub-processors", "We use: Supabase (hosting and database, EU), Stripe (payments, PCI DSS certified), Anthropic (AI generation, pseudonymized data), Gelato (book printing and shipping)."],
          ["6. Retention", "Your data is retained for the duration of your account, then deleted within 30 days of account closure, unless required by law."],
          ["7. Your rights", "You have the right to access, rectify, erase, port, and object to your data. Exercise these rights at hello@everypaw.app. EU residents may also contact their national data protection authority."],
          ["8. Cookies", "We use a session cookie for authentication and a preference cookie for language. No advertising or third-party tracking cookies are used."],
        ].map(([title, body]) => (
          <section key={title as string} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>{title}</h2>
            <p style={{ fontSize: ".95rem", color: "#7A5C44", lineHeight: 1.75, fontWeight: 300 }}>{body}</p>
          </section>
        ))}
      </main>

      <PublicFooter variant="minimal" locale="en" />
    </div>
  );
}
