"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";

function WaitlistForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async () => {
    if (!email || !email.includes("@")) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <p style={{ color: dark ? "#E8A96A" : "#C8813A", fontWeight: 500, fontSize: "1rem" }}>
        🐾 You&apos;re on the list! Check your inbox.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", justifyContent: "center" }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="your@email.com"
        style={{
          background: dark ? "rgba(247,242,234,.1)" : "#FDFAF5",
          border: `1px solid ${dark ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.18)"}`,
          borderRadius: "100px",
          padding: ".75rem 1.5rem",
          fontFamily: "inherit",
          fontSize: ".9rem",
          color: dark ? "#F7F2EA" : "#3D2B1F",
          width: "280px",
          outline: "none",
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={status === "loading"}
        style={{
          background: "#C8813A",
          color: "#FDFAF5",
          border: "none",
          borderRadius: "100px",
          padding: ".75rem 1.75rem",
          fontFamily: "inherit",
          fontSize: ".9rem",
          fontWeight: 500,
          cursor: "pointer",
          opacity: status === "loading" ? .7 : 1,
        }}
      >
        {status === "loading" ? "Joining..." : "Join the waitlist →"}
      </button>
      {status === "error" && (
        <p style={{ width: "100%", textAlign: "center", fontSize: ".8rem", color: "#A32D2D" }}>
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 3rem",
        background: "rgba(247,242,234,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(61,43,31,.08)",
      }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </span>
       <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
  <a href="/gift" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400 }}>
    🎁 Give a gift
  </a>
  <a href="#cta" style={{
    background: "#3D2B1F", color: "#F7F2EA",
    padding: ".5rem 1.25rem", borderRadius: "100px",
    fontSize: ".875rem", fontWeight: 500, textDecoration: "none",
  }}>
    Join the waitlist
  </a>
</div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "8rem 2rem 5rem", textAlign: "center",
        background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(200,129,58,.12) 0%, transparent 70%)",
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: ".5rem",
          background: "rgba(200,129,58,.12)", border: "1px solid rgba(200,129,58,.25)",
          color: "#C8813A", fontSize: ".75rem", fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase",
          padding: ".35rem .9rem", borderRadius: "100px", marginBottom: "2rem",
        }}>✦ Now in early access</span>

        <h1 style={{
          fontFamily: "Georgia, serif", fontSize: "clamp(2.8rem, 6vw, 5rem)",
          fontWeight: 600, lineHeight: 1.08, color: "#3D2B1F", maxWidth: 820,
          margin: "0 0 1.75rem",
        }}>
          Your pet&apos;s life deserves<br />
          a <em style={{ color: "#C8813A", fontStyle: "italic" }}>real story</em> — not just photos
        </h1>

        <p style={{ fontSize: "1.125rem", fontWeight: 300, color: "#7A5C44", maxWidth: 480, lineHeight: 1.7, margin: "0 auto 2.5rem" }}>
          Everypaw turns your daily moments into AI-crafted narratives and a beautiful printed book — one chapter at a time.
        </p>

        <WaitlistForm />

        <p style={{ fontSize: ".75rem", color: "#7A5C44", opacity: .7, marginTop: ".75rem" }}>
          Free to join · No credit card · First 200 members get 50% off at launch
        </p>

        {/* Book mock */}
        <div style={{ marginTop: "4rem", position: "relative", display: "inline-block" }}>
          <div style={{
            width: 260, height: 340,
            background: "linear-gradient(135deg, #5C3A1E 0%, #3D2B1F 100%)",
            borderRadius: "4px 16px 16px 4px",
            boxShadow: "-6px 0 0 rgba(0,0,0,.25), 8px 20px 60px rgba(61,43,31,.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 16, background: "rgba(0,0,0,.3)" }} />
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: ".75rem" }}>🐾</div>
              <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "1.1rem", color: "#F7C27A", lineHeight: 1.3, marginBottom: ".5rem" }}>
                The Life of Luna<br />2022 – 2025
              </div>
              <div style={{ fontSize: ".7rem", color: "rgba(247,242,234,.5)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                An Everypaw Book
              </div>
            </div>
            <div style={{
              position: "absolute", top: -12, right: -12,
              width: 64, height: 64, borderRadius: "50%",
              background: "#C8813A", color: "#FDFAF5",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              fontSize: ".6rem", fontWeight: 500, textAlign: "center", lineHeight: 1.2,
              transform: "rotate(12deg)",
            }}>Printed<br />hardcover</div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ padding: "4rem 2rem", textAlign: "center", background: "#EDE5D4" }}>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1rem" }}>
          {[
            ["94M", "US households with pets"],
            ["69%", "of millennials call pets family"],
            ["$2,500", "avg annual spend per dog"],
          ].map(([num, lbl]) => (
            <div key={num} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", margin: "0 2rem" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "3rem", fontWeight: 600, color: "#C8813A" }}>{num}</span>
              <span style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginTop: ".25rem" }}>{lbl}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "6rem 2rem", background: "#FDFAF5" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>What we do</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, lineHeight: 1.15, marginBottom: "3.5rem", maxWidth: 560 }}>
            Every moment remembered.<br />Every story worth telling.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              ["📝", "Effortless journaling", "Add moments in seconds — a photo, a quick note, a funny habit. No pressure to write beautifully. That's our job."],
              ["✨", "AI-crafted narratives", "Our AI transforms your raw moments into a warm, flowing story — written as if your pet narrates their own life."],
              ["📖", "Printed annual book", "Every year, a hardcover book arrives at your door. A real object to hold, gift, and keep for a lifetime."],
              ["🐾", "Built for pet parents", "Not a generic journal app. Every feature is designed around the unique bond between you and your animal."],
              ["🕊️", "A legacy that lasts", "When the time comes, your book becomes the most meaningful memorial you could ever have."],
              ["🎁", "The perfect gift", "Give an Everypaw subscription to any pet parent in your life. A gift that grows richer with every entry."],
            ].map(([icon, title, desc]) => (
              <div key={title as string} style={{ background: "#F7F2EA", borderRadius: 20, padding: "1.75rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", marginBottom: "1rem" }}>{icon}</div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: ".5rem" }}>{title}</h3>
                <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "6rem 2rem", background: "#3D2B1F", color: "#F7F2EA" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#E8A96A", marginBottom: "1rem" }}>How it works</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: "3.5rem", color: "#F7F2EA" }}>
            Three steps.<br />One story you&apos;ll keep forever.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem" }}>
            {[
              ["1", "Capture moments", "Add photos and short notes whenever something happens. A first swim, a vet visit, a stolen sock — log it in 30 seconds."],
              ["2", "AI writes the story", "Every month, our AI weaves your entries into a beautifully written narrative chapter — in your pet's own voice."],
              ["3", "Receive your book", "At year's end, a hardcover book of your pet's life is printed and shipped to you. No effort required."],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", border: "1.5px solid rgba(200,129,58,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontSize: "1.25rem", color: "#C8813A", marginBottom: "1.25rem" }}>{num}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 500, marginBottom: ".5rem", color: "#F7F2EA" }}>{title}</h3>
                <p style={{ fontSize: ".85rem", color: "rgba(247,242,234,.6)", lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "6rem 2rem", background: "#FDFAF5" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.75rem)", fontWeight: 600, marginBottom: "3rem", textAlign: "center" }}>
            Pet parents love it
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {[
              ["I always meant to keep a journal for Biscuit. Everypaw just does it for me — and the AI captures his personality perfectly.", "Sarah K. — Golden Retriever mom, Portland"],
              ["We lost our cat Mochi last spring. Having that printed book is the most precious thing we own. I cry every time I read it.", "James T. — Cat dad, Austin"],
              ["Gave an Everypaw subscription to my sister for her dog's birthday. She burst into tears when the first book arrived. Best gift I've ever given.", "Emma R. — Gift-giver, London"],
            ].map(([quote, author]) => (
              <div key={author as string} style={{ background: "#F7F2EA", borderRadius: 18, padding: "1.5rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                <div style={{ color: "#C8813A", fontSize: "1rem", letterSpacing: ".1em" }}>★★★★★</div>
                <p style={{ fontSize: ".875rem", fontStyle: "italic", lineHeight: 1.65, color: "#3D2B1F", fontFamily: "Georgia, serif", flex: 1 }}>&ldquo;{quote}&rdquo;</p>
                <p style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 500 }}>{author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "6rem 2rem", background: "#F7F2EA", textAlign: "center" }}>
        <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>Simple pricing</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: ".75rem" }}>
          Start free. Print when you&apos;re ready.
        </h2>
        <p style={{ fontSize: "1rem", color: "#7A5C44", fontWeight: 300, marginBottom: "3rem" }}>No surprise fees. Cancel anytime.</p>
        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem 2.25rem", flex: 1, minWidth: 260, textAlign: "left", border: "1.5px solid rgba(61,43,31,.08)" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#C8813A", marginBottom: ".75rem" }}>Free</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, marginBottom: ".25rem" }}>$0</div>
            <div style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginBottom: "1.5rem" }}>forever</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.75rem", padding: 0 }}>
              {["Up to 10 journal entries", "1 AI story generation", "Digital access", "One pet profile"].map(f => (
                <li key={f} style={{ fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".5rem", fontWeight: 300 }}>
                  <span style={{ color: "#C8813A", fontWeight: 600 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button style={{ width: "100%", padding: ".75rem", borderRadius: "100px", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", border: "1.5px solid #3D2B1F", background: "transparent", color: "#3D2B1F" }}>
              Get started free
            </button>
          </div>
          <div style={{ background: "#3D2B1F", borderRadius: 24, padding: "2rem 2.25rem", flex: 1, minWidth: 260, textAlign: "left", border: "1.5px solid #3D2B1F" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#E8A96A", marginBottom: ".75rem" }}>✦ Premium</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, marginBottom: ".25rem", color: "#F7F2EA" }}>$4.99</div>
            <div style={{ fontSize: ".8rem", color: "rgba(247,242,234,.6)", fontWeight: 300, marginBottom: "1.5rem" }}>per month · cancel anytime</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.75rem", padding: 0 }}>
              {["Unlimited entries & photos", "Monthly AI story chapters", "Annual printed hardcover book", "Multiple pet profiles", "Priority support"].map(f => (
                <li key={f} style={{ fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".5rem", fontWeight: 300, color: "rgba(247,242,234,.85)" }}>
                  <span style={{ color: "#C8813A", fontWeight: 600 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href="#cta" style={{ display: "block", width: "100%", padding: ".75rem", borderRadius: "100px", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", background: "#C8813A", border: "1.5px solid #C8813A", color: "#FDFAF5", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              Join the waitlist →
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" style={{ padding: "7rem 2rem", background: "linear-gradient(135deg, #3D2B1F 0%, #5C3A1E 100%)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(200,129,58,.2) 0%, transparent 70%)" }} />
        <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", fontWeight: 600, color: "#F7F2EA", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Their life is <em style={{ color: "#E8A96A", fontStyle: "italic" }}>happening</em><br />right now.
          </h2>
          <p style={{ fontSize: "1rem", color: "rgba(247,242,234,.65)", fontWeight: 300, marginBottom: "2.5rem" }}>
            Every day without a journal is a story lost forever. Start capturing the moments that matter — before they fade.
          </p>
          <WaitlistForm dark />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "2rem 3rem", background: "#3D2B1F", borderTop: "1px solid rgba(247,242,234,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1rem", color: "rgba(247,242,234,.6)", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(247,242,234,.3)", display: "inline-block" }} />
          Everypaw
        </span>
        <p style={{ fontSize: ".75rem", color: "rgba(247,242,234,.3)" }}>© 2025 Everypaw · Built with love for pet parents</p>
      </footer>
    </>
  );
}
