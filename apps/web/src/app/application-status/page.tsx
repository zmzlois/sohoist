"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
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

const STATUS_COPY: Record<
  string,
  { tone: StatusTone; title: string; body: string }
> = {
  submitted: {
    tone: "amber",
    title: "Your application is with us.",
    body: "We are reviewing the details before opening your private intro brief.",
  },
  under_review: {
    tone: "teal",
    title: "Your application is under review.",
    body: "A concierge review is in progress. You can come back here for the next step.",
  },
  approved: {
    tone: "teal",
    title: "You are approved.",
    body: "Set up your intro brief, privacy controls, reward pool, and trusted referrers.",
  },
  waitlisted: {
    tone: "lavender",
    title: "You are on the waitlist.",
    body: "We are opening access carefully so the network stays private and useful.",
  },
  rejected: {
    tone: "danger",
    title: "This application was not approved.",
    body: "No profile has been created for this application.",
  },
} as const;

export default function ApplicationStatusPage() {
  const { data: session, status } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const application = useQuery(
    api.applications.getMyApplication,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const profile = useQuery(
    api.profile.getMyProfile,
    sessionEmail ? { email: sessionEmail } : "skip",
  );

  if (status === "loading" || application === undefined) {
    return (
      <MemberScaffold
        eyebrow="Membership"
        title="Application status"
        subtitle="Loading your membership record."
        narrow
      >
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        </PaperCard>
      </MemberScaffold>
    );
  }

  if (!application) {
    return (
      <MemberScaffold
        eyebrow="Membership"
        title="No application yet."
        subtitle="Start with a private application before creating an intro brief."
        narrow
      >
        <PaperCard>
          <Link href="/apply" style={form.primary}>
            Apply privately
          </Link>
        </PaperCard>
      </MemberScaffold>
    );
  }

  const copy = STATUS_COPY[application.status as keyof typeof STATUS_COPY];

  return (
    <MemberScaffold
      eyebrow="Membership"
      title={copy.title}
      subtitle={copy.body}
      narrow
    >
      <PaperCard>
        <SectionHeading
          label="Application"
          detail={
            <StatusBadge tone={copy.tone}>
              {application.status.replace(/_/g, " ")}
            </StatusBadge>
          }
        />

        <div style={{ display: "grid", gap: 16 }}>
          <Detail label="Name" value={application.pseudonym ?? application.name} />
          <Detail
            label="Background"
            value={`${application.profession} · ${application.city}`}
          />
          <Detail label="Relationship intent" value={application.relationshipIntent} />
          <Detail label="Why Sohoist" value={application.whySohoist} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
          {application.status === "approved" || profile ? (
            <Link href="/dashboard" style={form.primary}>
              Continue setup
            </Link>
          ) : (
            <Link href="/dashboard" style={form.secondary}>
              Back to dashboard
            </Link>
          )}
        </div>
      </PaperCard>
    </MemberScaffold>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ ...form.label, marginBottom: 4 }}>{label}</p>
      <p
        style={{
          margin: 0,
          fontFamily: palette.body,
          fontSize: 14,
          lineHeight: 1.65,
          color: palette.ink,
        }}
      >
        {value}
      </p>
    </div>
  );
}
