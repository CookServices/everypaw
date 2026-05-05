"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleEmailLogin = async () => {
    setStatus("loading");
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setStatus("error"); }
    else window.location.href = "/dashboard";
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
            Everypaw
          </Link>
          <p style={{ marginTop: ".5rem", fontSize: ".9rem", color: "#7A5C44", fontWeight: 300 }}>Welcome back</p>
        </div>

        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", boxShadow: "0 4px 40px rgba(61,43,31,.06)" }}>
          <button onClick={handleGoogle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: ".75rem", padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, color: "#3D2B1F", cursor: "pointer", marginBottom: "1.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(61,43,31,.1)" }} />
            <span style={{ fontSize: ".75rem", color: "#7A5C44" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(61,43,31,.1)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none" }}
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmailLogin()}
              style={{ padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none" }}
            />
            {error && <p style={{ fontSize: ".8rem", color: "#A32D2D" }}>{error}</p>}
            <button onClick={handleEmailLogin} disabled={status === "loading"} style={{ padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: status === "loading" ? .7 : 1 }}>
              {status === "loading" ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: ".85rem", color: "#7A5C44" }}>
          No account?{" "}
          <Link href="/auth/signup" style={{ color: "#C8813A", fontWeight: 500, textDecoration: "none" }}>Create one →</Link>
        </p>
      </div>
    </div>
  );
}
