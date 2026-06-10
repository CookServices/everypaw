import Link from "next/link";
import { LEGAL_LAST_UPDATE } from "@/lib/legal";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = { title: "Legal Notices · Everypaw" };

export default function Notices() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 2rem 6rem" }}>
        <Link href="/" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>Back</Link>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "2rem 0 .75rem" }}>
          Legal Notices
        </h1>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: ".5rem" }}>In accordance with applicable law on online services.</p>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: "3rem" }}>Last updated: {LEGAL_LAST_UPDATE}</p>

        {[
          ["Publisher", "Everypaw\nEmail: hello@everypaw.app\nWebsite: www.everypaw.app"],
          ["Hosting", "This site is hosted by Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, United States.\nData is stored via Supabase, whose servers are located in the European Union (eu-west-1 region)."],
          ["Intellectual property", "All content on this site (text, graphics, logos, icons, images) is the exclusive property of Everypaw and is protected by applicable intellectual property laws. Any reproduction, representation, modification, publication, or adaptation — in whole or in part — is prohibited without prior written consent."],
          ["User content", "Journal entries, photos, and stories created by users remain their property. By publishing them on Everypaw, you grant Everypaw a limited license to store and use them solely to provide the service (AI story generation, book printing)."],
          ["Limitation of liability", "Everypaw takes all reasonable measures to ensure service availability and security, but cannot be held liable for service interruptions, data loss, or indirect damages resulting from use of the site."],
          ["Applicable law", "These legal notices are governed by French law. In the event of a dispute, French courts shall have exclusive jurisdiction."],
        ].map(([title, body]) => (
          <section key={title as string} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>{title}</h2>
            <p style={{ fontSize: ".95rem", color: "#7A5C44", lineHeight: 1.75, fontWeight: 300, whiteSpace: "pre-line" }}>{body}</p>
          </section>
        ))}
      </main>

      <PublicFooter variant="minimal" />
    </div>
  );
}
