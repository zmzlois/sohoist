"use client";

import Image from "next/image";
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
} from "@/components/member/MemberScaffold";
import portraitFallback from "../../../../../public/images/region-02.png";

export default function IntroBriefPage() {
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const profile = useQuery(
    api.profile.getMyProfile,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const assets = useQuery(
    api.photos.getMyAssets,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const rewardPool = useQuery(
    api.rewardPools.getMyRewardPool,
    sessionEmail ? { email: sessionEmail } : "skip",
  );

  return (
    <MemberScaffold
      eyebrow="Private intro brief"
      title="Not just a profile. A person, in context."
      subtitle="Preview the dossier your trusted referrers will use before making an introduction."
    >
      {profile === undefined || assets === undefined ? (
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        </PaperCard>
      ) : !profile ? (
        <PaperCard>
          <p style={{ margin: "0 0 18px", color: palette.stone }}>
            Your intro brief is created after your membership is approved.
          </p>
          <Link href="/application-status" style={form.primary}>
            View application status
          </Link>
        </PaperCard>
      ) : (
        <div style={briefGridStyle}>
          <PaperCard style={{ padding: 18 }}>
            {assets.sketch?.url ? (
              <Image
                src={assets.sketch.url}
                alt=""
                width={720}
                height={900}
                unoptimized
                style={portraitStyle}
              />
            ) : (
              <Image
                src={portraitFallback}
                alt=""
                style={portraitStyle}
                priority
              />
            )}
          </PaperCard>

          <PaperCard>
            <SectionHeading
              label="Intro brief"
              detail={
                profile.ghostMode ? (
                  <StatusBadge>Ghost Mode</StatusBadge>
                ) : (
                  <StatusBadge tone="teal">{profile.visibility}</StatusBadge>
                )
              }
            />

            <h2 style={headlineStyle}>
              {profile.headline ?? "Open to thoughtful introductions."}
            </h2>

            <p style={metaStyle}>
              {[
                profile.hideProfession ? null : profile.profession,
                profile.hideCity ? null : profile.city,
                profile.relationshipIntent,
              ]
                .filter(Boolean)
                .join(" · ") || "Private by default"}
            </p>

            {profile.tags?.length ? (
              <div style={tagsStyle}>
                {profile.tags.map((tag: string) => (
                  <StatusBadge key={tag}>{tag}</StatusBadge>
                ))}
              </div>
            ) : null}

            <hr style={dividerStyle} />

            <BriefSection
              label="Bio"
              value={profile.bio ?? "Create your voice brief to fill this in."}
            />
            <BriefSection
              label="Open to meeting"
              value={profile.openTo ?? "Not specified yet."}
            />
            <BriefSection
              label="Friends should refer someone who"
              value={profile.friendsShouldReferSomeoneWho ?? "Not specified yet."}
            />
            <BriefSection
              label="Do not refer if"
              value={profile.doNotReferIf ?? "Not specified yet."}
            />

            <div style={rewardStyle}>
              <span>Reward</span>
              <strong>
                {rewardPool
                  ? profile.hideRewardAmount || rewardPool.hideAmount
                    ? "Reward funded"
                    : `$${Math.round(rewardPool.amount / 100)}`
                  : "Not created"}
              </strong>
            </div>
          </PaperCard>
        </div>
      )}
    </MemberScaffold>
  );
}

function BriefSection({ label, value }: { label: string; value: string }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <p style={{ ...form.label, marginBottom: 5 }}>{label}</p>
      <p
        style={{
          margin: 0,
          fontFamily: palette.display,
          fontStyle: "italic",
          fontSize: 18,
          lineHeight: 1.55,
          color: palette.ink,
        }}
      >
        {value}
      </p>
    </section>
  );
}

const briefGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: 24,
  alignItems: "start",
};

const portraitStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "4 / 5",
  objectFit: "cover",
  borderRadius: 14,
  display: "block",
};

const headlineStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontFamily: palette.display,
  fontSize: "clamp(2rem, 4vw, 3.3rem)",
  fontWeight: 400,
  lineHeight: 1.02,
  letterSpacing: "-0.02em",
  color: palette.ink,
};

const metaStyle: React.CSSProperties = {
  margin: "0 0 14px",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 13,
};

const tagsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 18,
};

const dividerStyle: React.CSSProperties = {
  border: "none",
  borderTop: `1px solid ${palette.border}`,
  margin: "18px 0",
};

const rewardStyle: React.CSSProperties = {
  borderTop: `1px solid ${palette.border}`,
  paddingTop: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  fontFamily: palette.body,
  color: palette.stone,
};
