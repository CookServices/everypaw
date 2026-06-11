"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

type InviteStatus =
  | "loading"
  | "not_found"
  | "expired"
  | "revoked"
  | "already_accepted"
  | "email_mismatch"
  | "auth_required"
  | "accepting"
  | "accepted"
  | "error";

export default function InvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviteInfo, setInviteInfo] = useState<{ pet_name: string; pet_species: string; invited_email: string } | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string>("");
  const [petId, setPetId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Fetch invite details
      const detailsRes = await fetch(`/api/invite/${token}`);
      if (!detailsRes.ok) {
        const err = await detailsRes.json().catch(() => ({}));
        if (err.error === "expired" || err.error === "revoked") {
          setStatus(err.error as InviteStatus);
        } else if (err.error === "already_accepted") {
          setStatus("already_accepted");
        } else {
          setStatus("not_found");
        }
        return;
      }
      const info = await detailsRes.json();
      setInviteInfo(info);
      setInvitedEmail(info.invited_email);

      // 2. Check if user is logged in
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus("auth_required");
        return;
      }

      // 3. Attempt to accept
      await acceptInvite();
    };
    init();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptInvite = async () => {
    setStatus("accepting");
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      setPetId(data.pet_id);
      setStatus("accepted");
      setTimeout(() => {
        router.push(`/dashboard/pets/${data.pet_id}?tab=journal`);
      }, 2000);
      return;
    }

    if (data.error === "email_mismatch") {
      setInvitedEmail(data.invited_email ?? invitedEmail);
      setStatus("email_mismatch");
    } else if (data.error === "already_accepted") {
      setStatus("already_accepted");
    } else if (data.error === "expired") {
      setStatus("expired");
    } else if (data.error === "revoked") {
      setStatus("revoked");
    } else {
      setStatus("error");
    }
  };

  const loginUrl = `/auth/login?next=${encodeURIComponent(`/invite/${token}`)}`;
  const signupUrl = `/auth/signup?next=${encodeURIComponent(`/invite/${token}`)}`;

  const speciesEmoji = SPECIES_EMOJI[inviteInfo?.pet_species ?? "other"] ?? "🐾";

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 440, width: "100%", background: "#FDFAF5", borderRadius: 20, border: "1px solid #EDE5D4", padding: "2.5rem 2rem", textAlign: "center" }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ color: "#3D2B1F", fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 600, marginBottom: "2rem" }}>
            🐾 everypaw
          </div>
        </Link>

        {status === "loading" && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏳</div>
            <p style={{ color: "#7A5C44" }}>Loading invitation…</p>
          </>
        )}

        {status === "accepting" && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✨</div>
            <p style={{ color: "#7A5C44" }}>Accepting invitation…</p>
          </>
        )}

        {status === "accepted" && (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{speciesEmoji}</div>
            <h1 style={{ color: "#3D2B1F", fontSize: "1.4rem", margin: "0 0 .75rem", fontFamily: "Georgia, serif" }}>
              You're in!
            </h1>
            <p style={{ color: "#7A5C44", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
              Welcome to <strong>{inviteInfo?.pet_name}</strong>'s journal. You can now add entries and photos.
            </p>
            <p style={{ color: "#9A8070", fontSize: ".85rem" }}>Redirecting to the journal…</p>
          </>
        )}

        {status === "auth_required" && inviteInfo && (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{speciesEmoji}</div>
            <h1 style={{ color: "#3D2B1F", fontSize: "1.4rem", margin: "0 0 .75rem", fontFamily: "Georgia, serif" }}>
              You're invited to join {inviteInfo.pet_name}'s journal
            </h1>
            <p style={{ color: "#7A5C44", lineHeight: 1.6, margin: "0 0 .5rem" }}>
              Sign in with <strong>{inviteInfo.invited_email}</strong> to accept this invitation.
            </p>
            <p style={{ color: "#9A8070", fontSize: ".82rem", marginBottom: "1.75rem" }}>
              New to Everypaw? Create a free account below.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <a
                href={loginUrl}
                style={{ display: "block", background: "#C8813A", color: "#FDFAF5", textDecoration: "none", padding: "13px 24px", borderRadius: 100, fontWeight: 600, fontSize: ".95rem", fontFamily: "inherit" }}
              >
                Sign in to accept →
              </a>
              <a
                href={signupUrl}
                style={{ display: "block", background: "transparent", color: "#C8813A", textDecoration: "none", padding: "13px 24px", borderRadius: 100, fontWeight: 500, fontSize: ".95rem", border: "1.5px solid #C8813A", fontFamily: "inherit" }}
              >
                Create an account
              </a>
            </div>
          </>
        )}

        {status === "email_mismatch" && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔒</div>
            <h1 style={{ color: "#3D2B1F", fontSize: "1.4rem", margin: "0 0 .75rem", fontFamily: "Georgia, serif" }}>
              Wrong account
            </h1>
            <p style={{ color: "#7A5C44", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
              This invitation was sent to <strong>{invitedEmail}</strong>.
              Please sign in with that address to accept.
            </p>
            <a
              href={loginUrl}
              style={{ display: "inline-block", background: "#C8813A", color: "#FDFAF5", textDecoration: "none", padding: "13px 24px", borderRadius: 100, fontWeight: 600, fontSize: ".95rem", fontFamily: "inherit" }}
            >
              Sign in with correct account →
            </a>
          </>
        )}

        {status === "already_accepted" && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✅</div>
            <h1 style={{ color: "#3D2B1F", fontSize: "1.4rem", margin: "0 0 .75rem", fontFamily: "Georgia, serif" }}>
              Already accepted
            </h1>
            <p style={{ color: "#7A5C44", margin: "0 0 1.5rem" }}>You're already a member of this journal.</p>
            <Link
              href="/dashboard"
              style={{ display: "inline-block", background: "#C8813A", color: "#FDFAF5", textDecoration: "none", padding: "13px 24px", borderRadius: 100, fontWeight: 600, fontSize: ".95rem" }}
            >
              Go to dashboard →
            </Link>
          </>
        )}

        {(status === "expired" || status === "revoked") && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏰</div>
            <h1 style={{ color: "#3D2B1F", fontSize: "1.4rem", margin: "0 0 .75rem", fontFamily: "Georgia, serif" }}>
              {status === "expired" ? "Invitation expired" : "Invitation cancelled"}
            </h1>
            <p style={{ color: "#7A5C44", margin: "0 0 1.5rem" }}>
              {status === "expired"
                ? "This invitation has expired. Ask the pet owner to send a new one."
                : "This invitation has been cancelled by the pet owner."}
            </p>
            <Link
              href="/"
              style={{ display: "inline-block", color: "#C8813A", textDecoration: "none", fontWeight: 500, fontSize: ".95rem" }}
            >
              ← Back to home
            </Link>
          </>
        )}

        {(status === "not_found" || status === "error") && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>❌</div>
            <h1 style={{ color: "#3D2B1F", fontSize: "1.4rem", margin: "0 0 .75rem", fontFamily: "Georgia, serif" }}>
              {status === "not_found" ? "Invitation not found" : "Something went wrong"}
            </h1>
            <p style={{ color: "#7A5C44", margin: "0 0 1.5rem" }}>
              {status === "not_found"
                ? "This invitation link is invalid or has already been used."
                : "We couldn't process your invitation. Please try again."}
            </p>
            <Link
              href="/"
              style={{ display: "inline-block", color: "#C8813A", textDecoration: "none", fontWeight: 500, fontSize: ".95rem" }}
            >
              ← Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
