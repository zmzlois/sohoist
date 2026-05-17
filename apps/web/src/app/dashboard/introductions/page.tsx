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

const STATUS_LABELS: Record<string, { label: string; tone: StatusTone }> = {
  candidate_invited: { label: "Candidate invited", tone: "amber" },
  candidate_accepted: { label: "Accepted", tone: "teal" },
  candidate_declined: { label: "Declined", tone: "neutral" },
  intro_active: { label: "Intro active", tone: "teal" },
  first_date_logged: { label: "First date logged", tone: "teal" },
  relationship_confirmed: { label: "Relationship confirmed", tone: "teal" },
  payout_pending: { label: "Payout pending", tone: "amber" },
  paid: { label: "Paid", tone: "teal" },
  closed: { label: "Closed", tone: "neutral" },
};

export default function IntroductionsPage() {
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const intros = useQuery(
    api.introductions.getMyIntroductions,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const updateStatus = useMutation(api.introductions.updateIntroductionStatus);
  const [acting, setActing] = useState("");

  async function advance(id: string, status: "intro_active" | "first_date_logged" | "relationship_confirmed" | "closed") {
    if (!sessionEmail) return;
    setActing(`${id}:${status}`);
    try {
      await updateStatus({ introductionId: id as any, status, email: sessionEmail });
    } finally {
      setActing("");
    }
  }

  return (
    <MemberScaffold
      eyebrow="Intro room"
      title="Start with context, not a cold message."
      subtitle="Track accepted referrals, candidate response, first dates, and relationship verification."
    >
      <PaperCard>
        <SectionHeading
          label="Introductions"
          detail={intros ? `${intros.length} active records` : "Loading"}
        />

        {intros === undefined ? (
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        ) : intros.length === 0 ? (
          <div style={emptyStyle}>
            No introductions yet. Accept a referral to open an intro room.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {intros.map((intro: any) => {
              const status = STATUS_LABELS[intro.status] ?? {
                label: intro.status,
                tone: "neutral" as StatusTone,
              };
              const candidateUrl =
                typeof window === "undefined"
                  ? `/intro/${intro.inviteToken}`
                  : `${window.location.origin}/intro/${intro.inviteToken}`;
              return (
                <article key={intro._id} style={cardStyle}>
                  <div style={topStyle}>
                    <div>
                      <h2 style={titleStyle}>
                        {intro.referral?.candidateName ?? "Candidate"}
                      </h2>
                      <p style={metaStyle}>Referred by {intro.referrerName}</p>
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>

                  <p style={form.hint}>{intro.referral?.whyAFit}</p>

                  <label>
                    <span style={form.label}>Candidate link</span>
                    <input readOnly value={candidateUrl} style={form.input} />
                  </label>

                  <div style={actionsStyle}>
                    <button
                      type="button"
                      style={form.secondary}
                      onClick={() => navigator.clipboard?.writeText(candidateUrl)}
                    >
                      Copy candidate link
                    </button>
                    <button
                      type="button"
                      style={form.secondary}
                      onClick={() => advance(intro._id, "intro_active")}
                      disabled={Boolean(acting)}
                    >
                      Mark active
                    </button>
                    <button
                      type="button"
                      style={form.secondary}
                      onClick={() => advance(intro._id, "first_date_logged")}
                      disabled={Boolean(acting)}
                    >
                      First date logged
                    </button>
                    <button
                      type="button"
                      style={form.primary}
                      onClick={() => advance(intro._id, "relationship_confirmed")}
                      disabled={Boolean(acting)}
                    >
                      Confirm relationship
                    </button>
                    <button
                      type="button"
                      style={form.secondary}
                      onClick={() => advance(intro._id, "closed")}
                      disabled={Boolean(acting)}
                    >
                      Close
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PaperCard>
    </MemberScaffold>
  );
}

const emptyStyle: React.CSSProperties = {
  borderRadius: 18,
  border: `1px dashed ${palette.border}`,
  backgroundColor: "rgba(220,230,234,0.25)",
  padding: 24,
  color: palette.stone,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(245,239,230,0.54)",
  padding: 18,
  display: "grid",
  gap: 14,
};

const topStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: palette.display,
  fontSize: 28,
  fontWeight: 400,
  color: palette.ink,
};

const metaStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 12,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
