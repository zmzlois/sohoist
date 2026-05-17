"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  form,
  MemberScaffold,
  PaperCard,
  palette,
  SectionHeading,
  StatusBadge,
} from "@/components/member/MemberScaffold";
import logoMark from "../../../../public/images/logo.png";
import portraitFallback from "../../../../public/images/region-02.png";
import noteImage from "../../../../public/images/region-01.png";
import paperNote from "../../../../public/images/region-06.png";
import networkMap from "../../../../public/images/network-map.png";

const DEFAULT_MESSAGE =
  "I'm using Sohoist for private introductions. If someone comes to mind who you genuinely think I'd click with, I'd love your referral.";

export default function SharedProfilePreviewPage() {
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
  const [copied, setCopied] = useState(false);

  const rewardLabel = useMemo(() => {
    if (!rewardPool) return "Reward not created";
    if (profile?.hideRewardAmount || rewardPool.hideAmount) return "Reward funded";
    return `$${Math.round(rewardPool.amount / 100)} thank-you reward`;
  }, [profile?.hideRewardAmount, rewardPool]);

  async function copyMessage() {
    await navigator.clipboard?.writeText(DEFAULT_MESSAGE);
    setCopied(true);
  }

  return (
    <MemberScaffold
      eyebrow="Shared profile"
      title="How your private profile appears."
      subtitle="This is the referrer-facing preview: sketch first, context second, private by default."
    >
      {profile === undefined || assets === undefined ? (
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        </PaperCard>
      ) : !profile ? (
        <PaperCard>
          <p style={{ margin: "0 0 18px", color: palette.stone }}>
            Your shared profile preview opens after your membership is approved.
          </p>
          <Link href="/application-status" style={form.primary}>
            View application status
          </Link>
        </PaperCard>
      ) : (
        <div style={layoutStyle}>
          <PaperCard style={previewShellStyle}>
            <div style={previewHeaderStyle}>
              <div style={brandStyle}>
                <Image src={logoMark} alt="" style={logoStyle} priority />
                <span>
                  <strong>Sohoist</strong>
                  <small>Private intro brief</small>
                </span>
              </div>
              <StatusBadge tone={profile.ghostMode ? "lavender" : "teal"}>
                {profile.ghostMode ? "Ghost mode" : profile.visibility}
              </StatusBadge>
            </div>

            <div style={profileGridStyle}>
              <div style={portraitFrameStyle}>
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
              </div>

              <div>
                <p style={kickerStyle}>By introduction</p>
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

                <div style={rewardPillStyle}>
                  <span>{rewardLabel}</span>
                  <small>Releases after verified six-month relationship</small>
                </div>

                {profile.tags?.length ? (
                  <div style={tagsStyle}>
                    {profile.tags.map((tag: string) => (
                      <StatusBadge key={tag}>{tag}</StatusBadge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={briefColumnsStyle}>
              <PreviewSection
                label="Who I am"
                value={profile.bio ?? "Create your voice brief to fill this in."}
              />
              <PreviewSection
                label="Who I am looking for"
                value={profile.openTo ?? "Not specified yet."}
              />
              <PreviewSection
                label="What friends should know"
                value={
                  profile.friendsShouldReferSomeoneWho ??
                  "Trusted referrers can add real-world context."
                }
              />
              <PreviewSection
                label="Not a fit if"
                value={profile.doNotReferIf ?? "No boundaries added yet."}
              />
            </div>
          </PaperCard>

          <div style={sideStackStyle}>
            <PaperCard>
              <SectionHeading label="Share controls" />
              <Image src={noteImage} alt="" style={noteStyle} />
              <p style={sideCopyStyle}>{DEFAULT_MESSAGE}</p>
              <div style={actionsStyle}>
                <button type="button" onClick={copyMessage} style={form.secondary}>
                  {copied ? "Copied" : "Copy message"}
                </button>
                <Link href="/dashboard/referrers/invite" style={form.primary}>
                  Create private link
                </Link>
              </div>
            </PaperCard>

            <PaperCard style={paperCardStyle}>
              <Image src={paperNote} alt="" style={paperBackgroundStyle} />
              <div style={termsOverlayStyle}>
                <SectionHeading
                  label="What viewers see"
                  detail={<StatusBadge tone="teal">Signed-in only</StatusBadge>}
                />
                <ul style={termsListStyle}>
                  <li>They see the sketch, never the original photo.</li>
                  <li>They must sign in before accepting the invite.</li>
                  <li>You can revoke access from the trusted circle screen.</li>
                  <li>The reward appears as funded if the exact amount is hidden.</li>
                </ul>
              </div>
            </PaperCard>

            <PaperCard style={{ padding: 0, overflow: "hidden" }}>
              <Image src={networkMap} alt="" style={networkStyle} />
            </PaperCard>
          </div>
        </div>
      )}
    </MemberScaffold>
  );
}

function PreviewSection({ label, value }: { label: string; value: string }) {
  return (
    <section style={previewSectionStyle}>
      <p style={sectionLabelStyle}>{label}</p>
      <p style={sectionValueStyle}>{value}</p>
    </section>
  );
}

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: 24,
  alignItems: "start",
};

const previewShellStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: 28,
};

const previewHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 22,
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontFamily: palette.body,
  color: palette.ink,
};

const logoStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  objectFit: "cover",
};

const profileGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: 24,
  alignItems: "center",
};

const portraitFrameStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 22,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(245,239,230,0.58)",
};

const portraitStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "4 / 5",
  objectFit: "cover",
  borderRadius: 16,
  display: "block",
};

const kickerStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: palette.teal,
  fontFamily: palette.body,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const headlineStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: palette.display,
  fontSize: "clamp(2.2rem, 5vw, 4rem)",
  fontWeight: 400,
  lineHeight: 1.02,
  letterSpacing: "-0.02em",
  color: palette.ink,
};

const metaStyle: React.CSSProperties = {
  margin: "14px 0 0",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 13,
};

const rewardPillStyle: React.CSSProperties = {
  marginTop: 18,
  borderRadius: 18,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(214,181,109,0.14)",
  padding: 14,
  display: "grid",
  gap: 3,
  color: palette.ink,
  fontFamily: palette.body,
  fontSize: 14,
};

const tagsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 16,
};

const briefColumnsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: 14,
  marginTop: 24,
};

const previewSectionStyle: React.CSSProperties = {
  borderTop: `1px solid ${palette.border}`,
  paddingTop: 14,
};

const sectionLabelStyle: React.CSSProperties = {
  ...form.label,
  marginBottom: 6,
};

const sectionValueStyle: React.CSSProperties = {
  margin: 0,
  color: palette.ink,
  fontFamily: palette.display,
  fontStyle: "italic",
  fontSize: 19,
  lineHeight: 1.48,
};

const sideStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const noteStyle: React.CSSProperties = {
  width: "100%",
  height: 150,
  objectFit: "cover",
  borderRadius: 16,
  display: "block",
  marginBottom: 14,
};

const sideCopyStyle: React.CSSProperties = {
  margin: "0 0 16px",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 13,
  lineHeight: 1.7,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const paperCardStyle: React.CSSProperties = {
  position: "relative",
  minHeight: 260,
  overflow: "hidden",
};

const paperBackgroundStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  opacity: 0.38,
};

const termsOverlayStyle: React.CSSProperties = {
  position: "relative",
};

const termsListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: palette.ink,
  fontFamily: palette.body,
  fontSize: 13,
  lineHeight: 1.72,
};

const networkStyle: React.CSSProperties = {
  width: "100%",
  height: 220,
  objectFit: "cover",
  display: "block",
};
