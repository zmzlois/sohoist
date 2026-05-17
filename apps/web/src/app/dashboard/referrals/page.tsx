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

export default function ReferralInboxPage() {
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const referrals = useQuery(
    api.referrals.getMyReferrals,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const respondToReferral = useMutation(api.referrals.respondToReferral);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function respond(referralId: string, action: "accepted" | "declined") {
    if (!sessionEmail || acting) return;
    setActing(`${referralId}:${action}`);
    setError("");
    try {
      await respondToReferral({
        email: sessionEmail,
        referralId: referralId as any,
        action,
      });
    } catch {
      setError("Couldn't update the referral. Try again.");
    } finally {
      setActing(null);
    }
  }

  return (
    <MemberScaffold
      eyebrow="Referral inbox"
      title="Introductions from people who know you best."
      subtitle="Review the context before deciding whether to open an intro."
    >
      <PaperCard>
        <SectionHeading
          label="Inbox"
          detail={referrals ? `${referrals.length} referrals` : "Loading"}
        />

        {error ? <p style={{ ...form.error, marginBottom: 14 }}>{error}</p> : null}

        {referrals === undefined ? (
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        ) : referrals.length === 0 ? (
          <div style={emptyStyle}>
            <p
              style={{
                margin: "0 0 8px",
                fontFamily: palette.display,
                fontStyle: "italic",
                fontSize: 22,
                color: palette.stone,
              }}
            >
              No referrals yet.
            </p>
            <p style={{ margin: 0, color: palette.stone, lineHeight: 1.6 }}>
              Share your intro brief with trusted friends when you are ready.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {referrals.map((referral: any) => {
              const pending = referral.status === "submitted";
              return (
                <article key={referral._id} style={referralStyle}>
                  <div style={referralHeaderStyle}>
                    <div>
                      <h2 style={candidateNameStyle}>{referral.candidateName}</h2>
                      <p style={metaStyle}>
                        {referral.candidateCity
                          ? `${referral.candidateCity} · `
                          : ""}
                        Referred by {referral.referrerName}
                      </p>
                    </div>
                    <StatusBadge tone={statusTone(referral.status)}>
                      {referral.status}
                    </StatusBadge>
                  </div>

                  <Detail label="Why they might fit" value={referral.whyAFit} />
                  <Detail
                    label="How your friend knows them"
                    value={referral.howReferrerKnowsThem}
                  />
                  <Detail
                    label="Candidate knows about the intro"
                    value={referral.candidateKnowsAboutIntro ? "Yes" : "No"}
                  />

                  {pending ? (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => respond(referral._id, "accepted")}
                        disabled={Boolean(acting)}
                        style={form.primary}
                      >
                        {acting === `${referral._id}:accepted`
                          ? "Accepting..."
                          : "Accept intro"}
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(referral._id, "declined")}
                        disabled={Boolean(acting)}
                        style={form.secondary}
                      >
                        {acting === `${referral._id}:declined`
                          ? "Declining..."
                          : "Decline"}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </PaperCard>
    </MemberScaffold>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ ...form.label, marginBottom: 4 }}>{label}</p>
      <p style={{ margin: "0 0 14px", color: palette.ink, lineHeight: 1.65 }}>
        {value}
      </p>
    </div>
  );
}

function statusTone(status: string): StatusTone {
  if (status === "accepted") return "teal";
  if (status === "declined") return "neutral";
  if (status === "viewed") return "lavender";
  return "amber";
}

const emptyStyle: React.CSSProperties = {
  borderRadius: 18,
  border: `1px dashed ${palette.border}`,
  backgroundColor: "rgba(220,230,234,0.24)",
  padding: 24,
};

const referralStyle: React.CSSProperties = {
  borderRadius: 18,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(245,239,230,0.54)",
  padding: 18,
};

const referralHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 16,
};

const candidateNameStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: palette.display,
  fontSize: 26,
  fontWeight: 400,
  color: palette.ink,
};

const metaStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontFamily: palette.body,
  fontSize: 12,
  color: palette.stone,
};
