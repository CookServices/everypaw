"use client";

import { Translations, MemberRow } from "./types";

type InviteResult = { success?: boolean; resent?: boolean; error?: string } | null;

export default function MembersTab({
  t, isFR, petId, userPlan,
  inviteEmail, setInviteEmail, inviteLoading, setInviteLoading, inviteResult, setInviteResult,
  membersLoaded, setMembersLoaded, members, setMembers, revokeConfirmId, setRevokeConfirmId,
}: {
  t: Translations;
  isFR: boolean;
  petId: string;
  userPlan: string;
  inviteEmail: string;
  setInviteEmail: React.Dispatch<React.SetStateAction<string>>;
  inviteLoading: boolean;
  setInviteLoading: React.Dispatch<React.SetStateAction<boolean>>;
  inviteResult: InviteResult;
  setInviteResult: React.Dispatch<React.SetStateAction<InviteResult>>;
  membersLoaded: boolean;
  setMembersLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  members: MemberRow[];
  setMembers: React.Dispatch<React.SetStateAction<MemberRow[]>>;
  revokeConfirmId: string | null;
  setRevokeConfirmId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  return (
    <div style={{ padding: "0 1.5rem 2rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .5rem", fontFamily: "Georgia, serif" }}>
        {t.members.title}
      </h2>
      <p style={{ fontSize: ".85rem", color: "var(--ep-text-muted)", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
        {t.members.subtitle}
      </p>

      {/* Upgrade upsell for non-paid plan owners */}
      {(userPlan === "free" || userPlan === "book_only") && (
        <div style={{ background: "#FFF3E0", border: "1px solid #F7C27A", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .4rem", fontSize: ".95rem" }}>{t.members.upgrade_title}</p>
          <p style={{ color: "var(--ep-text-muted)", fontSize: ".85rem", margin: "0 0 1rem", lineHeight: 1.5 }}>{t.members.upgrade_desc}</p>
          <a href="/dashboard/upgrade" style={{ display: "inline-block", background: "var(--ep-brand)", color: "var(--ep-bg-card)", textDecoration: "none", padding: "10px 20px", borderRadius: 100, fontWeight: 600, fontSize: ".85rem", fontFamily: "inherit" }}>
            {t.members.upgrade_cta}
          </a>
        </div>
      )}

      {/* Invite form, for paid plan owners */}
      {(userPlan === "digital" || userPlan === "print") && (
        <div style={{ background: "var(--ep-bg-card)", border: "1px solid rgba(61,43,31,.1)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: ".8rem", fontWeight: 500, color: "var(--ep-text-muted)", marginBottom: ".5rem" }}>
            {t.members.invite_label}
          </label>
          <div style={{ display: "flex", gap: ".625rem", flexWrap: "wrap" }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setInviteResult(null); }}
              placeholder={t.members.invite_placeholder}
              style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 8, border: "1.5px solid #D4C5B0", background: "var(--ep-bg)", color: "var(--ep-text)", fontSize: ".9rem", fontFamily: "inherit", outline: "none" }}
            />
            <button
              disabled={inviteLoading || !inviteEmail.trim()}
              onClick={async () => {
                setInviteLoading(true);
                setInviteResult(null);
                const res = await fetch("/api/pet-members", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ petId, email: inviteEmail.trim() }),
                });
                const data = await res.json();
                setInviteLoading(false);
                if (res.ok) {
                  setInviteResult({ success: true, resent: data.resent });
                  setInviteEmail("");
                  setMembersLoaded(false); // reload list
                  setTimeout(() => setInviteResult(null), 10000);
                } else {
                  const errKey = data.error as string;
                  const errMsg =
                    errKey === "cannot_invite_self" ? t.members.error_cannot_invite_self :
                    errKey === "already_member" ? t.members.error_already_member :
                    errKey === "member_limit" ? t.members.error_member_limit :
                    errKey === "upgrade_required" ? t.members.error_upgrade_required :
                    errKey === "Invalid email" ? t.members.error_invalid_email :
                    t.members.error_generic;
                  setInviteResult({ error: errMsg });
                  setTimeout(() => setInviteResult(null), 10000);
                }
              }}
              style={{ padding: "10px 18px", borderRadius: 100, background: "var(--ep-brand)", color: "var(--ep-bg-card)", border: "none", cursor: inviteLoading || !inviteEmail.trim() ? "not-allowed" : "pointer", fontWeight: 600, fontSize: ".85rem", fontFamily: "inherit", opacity: inviteLoading || !inviteEmail.trim() ? .6 : 1, flexShrink: 0 }}
            >
              {inviteLoading ? t.members.invite_sending : t.members.invite_cta}
            </button>
          </div>
          {inviteResult?.success && (
            <p style={{ color: "#2E7D32", fontSize: ".8rem", margin: ".6rem 0 0" }}>
              ✓ {inviteResult.resent ? t.members.invite_resent : t.members.invite_success}
            </p>
          )}
          {inviteResult?.error && (
            <p style={{ color: "var(--ep-alert)", fontSize: ".8rem", margin: ".6rem 0 0" }}>{inviteResult.error}</p>
          )}
          <p style={{ color: "var(--ep-text-faint)", fontSize: ".75rem", margin: ".75rem 0 0" }}>{t.members.max_members}</p>
        </div>
      )}

      {/* Member list */}
      {!membersLoaded ? (
        <p style={{ color: "var(--ep-text-faint)", fontSize: ".85rem", fontStyle: "italic" }}>{isFR ? "Chargement…" : "Loading…"}</p>
      ) : members.length === 0 ? (
        <p style={{ color: "var(--ep-text-faint)", fontSize: ".875rem", fontStyle: "italic", textAlign: "center", padding: "2rem 0" }}>{t.members.empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
          {members.map(member => (
            <div key={member.id} style={{ background: "var(--ep-bg-card)", border: "1px solid rgba(61,43,31,.08)", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: "0 0 .2rem", fontWeight: 500, color: "var(--ep-text)", fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {member.display_name}
                </p>
                <p style={{ margin: 0, fontSize: ".75rem", color: "var(--ep-text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {member.invited_email}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: ".625rem", flexShrink: 0 }}>
                <span style={{
                  fontSize: ".72rem", fontWeight: 500, padding: "3px 10px", borderRadius: 100,
                  background: member.status === "accepted" ? "rgba(46,94,30,.1)" : "rgba(61,43,31,.07)",
                  color: member.status === "accepted" ? "#2E5E1E" : "var(--ep-text-muted)",
                }}>
                  {member.status === "accepted" ? t.members.status_accepted : t.members.status_pending}
                </span>
                {revokeConfirmId === member.id ? (
                  <div style={{ display: "flex", gap: ".4rem" }}>
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/pet-members/${member.id}/revoke`, { method: "POST" });
                        if (res.ok) {
                          setMembers(prev => prev.filter(m => m.id !== member.id));
                        }
                        setRevokeConfirmId(null);
                      }}
                      style={{ padding: "5px 12px", borderRadius: 100, background: "var(--ep-alert)", color: "#fff", border: "none", cursor: "pointer", fontSize: ".78rem", fontWeight: 500, fontFamily: "inherit" }}>
                      {t.members.revoke_yes}
                    </button>
                    <button
                      onClick={() => setRevokeConfirmId(null)}
                      style={{ padding: "5px 12px", borderRadius: 100, background: "transparent", color: "var(--ep-text-muted)", border: "1px solid rgba(61,43,31,.15)", cursor: "pointer", fontSize: ".78rem", fontFamily: "inherit" }}>
                      {t.members.revoke_no}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRevokeConfirmId(member.id)}
                    style={{ padding: "5px 12px", borderRadius: 100, background: "transparent", color: "var(--ep-text-faint)", border: "1px solid rgba(61,43,31,.12)", cursor: "pointer", fontSize: ".78rem", fontFamily: "inherit" }}>
                    {t.members.revoke_cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
