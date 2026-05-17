"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  form,
  MemberScaffold,
  PaperCard,
  palette,
  SectionHeading,
  StatusBadge,
  type StatusTone,
} from "@/components/member/MemberScaffold";

export default function InviteReferrerPage() {
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const inviteReferrer = useMutation(api.referrers.inviteReferrer);
  const referrers = useQuery(
    api.referrers.getMyReferrers,
    sessionEmail ? { email: sessionEmail } : "skip",
  );

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const canInvite = Boolean(email.trim() || phone.trim()) && !saving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canInvite || !sessionEmail) return;

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      await inviteReferrer({
        sessionEmail,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setEmail("");
      setPhone("");
      setSaved(true);
    } catch {
      setError("Couldn't create the invite. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MemberScaffold
      eyebrow="Trusted circle"
      title="Invite people who know your taste."
      subtitle="Referrers can help make thoughtful introductions once you approve them."
      narrow
    >
      <div style={{ display: "grid", gap: 22 }}>
        <PaperCard>
          <SectionHeading label="Invite a referrer" />
          <form onSubmit={handleSubmit} style={form.grid}>
            <label>
              <span style={form.label}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="friend@example.com"
                style={form.input}
              />
            </label>
            <label>
              <span style={form.label}>Phone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Optional"
                style={form.input}
              />
            </label>
            <p style={form.hint}>
              The invite record is created now. Email/SMS delivery can be wired
              once the notification channel is chosen.
            </p>
            {error ? <p style={form.error}>{error}</p> : null}
            {saved ? (
              <p style={{ margin: 0, color: palette.teal }}>
                Invite saved to your trusted circle.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!canInvite}
              style={{
                ...form.primary,
                opacity: canInvite ? 1 : 0.45,
                cursor: canInvite ? "pointer" : "default",
              }}
            >
              {saving ? "Saving invite..." : "Invite referrer"}
            </button>
          </form>
        </PaperCard>

        <PaperCard>
          <SectionHeading
            label="Current circle"
            detail={referrers ? `${referrers.length} invited` : "Loading"}
          />
          {referrers === undefined ? (
            <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
          ) : referrers.length === 0 ? (
            <p style={{ margin: 0, color: palette.stone }}>
              No referrers invited yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {referrers.map((referrer: any) => (
                <div key={referrer._id} style={rowStyle}>
                  <span>
                    {referrer.email ?? referrer.phone ?? "Private invite"}
                  </span>
                  <StatusBadge tone={statusTone(referrer.status)}>
                    {referrer.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </PaperCard>
      </div>
    </MemberScaffold>
  );
}

function statusTone(status: string): StatusTone {
  if (status === "approved") return "teal";
  if (status === "accepted") return "amber";
  if (status === "removed") return "neutral";
  return "lavender";
}

const rowStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 16,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(245,239,230,0.52)",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  fontFamily: palette.body,
  fontSize: 14,
  color: palette.ink,
};
