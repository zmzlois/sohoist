"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  form,
  MemberScaffold,
  PaperCard,
  palette,
  SectionHeading,
  StatusBadge,
} from "@/components/member/MemberScaffold";
import portraitFallback from "../../../../public/images/region-02.png";

export default function CandidateIntroPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const intro = useQuery(
    api.introductions.getCandidateIntroByToken,
    token ? { token } : "skip",
  );
  const respond = useMutation(api.introductions.respondToCandidateIntro);
  const [acting, setActing] = useState("");
  const [message, setMessage] = useState("");

  async function handleResponse(action: "accepted" | "declined") {
    if (!token) return;
    setActing(action);
    try {
      await respond({ token, action });
      setMessage(
        action === "accepted"
          ? "You accepted the introduction."
          : "You declined the introduction.",
      );
    } finally {
      setActing("");
    }
  }

  return (
    <MemberScaffold
      eyebrow="Private introduction"
      title={
        intro
          ? `${intro.referrerName} thought you and ${intro.memberName} might enjoy meeting.`
          : "Private introduction"
      }
      subtitle="No pressure. If this feels interesting, you can accept the introduction."
    >
      {intro === undefined ? (
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        </PaperCard>
      ) : !intro ? (
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>
            This introduction link is unavailable.
          </p>
        </PaperCard>
      ) : (
        <div style={gridStyle}>
          <PaperCard>
            {intro.sketchUrl ? (
              <Image
                src={intro.sketchUrl}
                alt=""
                width={720}
                height={900}
                unoptimized
                style={portraitStyle}
              />
            ) : (
              <Image src={portraitFallback} alt="" style={portraitStyle} />
            )}
          </PaperCard>

          <PaperCard>
            <SectionHeading
              label="Intro context"
              detail={<StatusBadge>{intro.status.replace(/_/g, " ")}</StatusBadge>}
            />
            <h2 style={headlineStyle}>
              {intro.memberHeadline ?? intro.memberName}
            </h2>
            <p style={metaStyle}>
              {[intro.profession, intro.city].filter(Boolean).join(" · ")}
            </p>
            <Brief label="Why this could work" value={intro.whyAFit} />
            <Brief label="How your referrer knows them" value={intro.howReferrerKnowsThem} />
            <Brief label="About them" value={intro.memberBio} />
            <Brief label="Open to meeting" value={intro.openTo} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
              <button
                type="button"
                style={form.primary}
                disabled={Boolean(acting) || Boolean(message)}
                onClick={() => handleResponse("accepted")}
              >
                {acting === "accepted" ? "Accepting..." : "Accept intro"}
              </button>
              <button
                type="button"
                style={form.secondary}
                disabled={Boolean(acting) || Boolean(message)}
                onClick={() => handleResponse("declined")}
              >
                {acting === "declined" ? "Declining..." : "Decline"}
              </button>
            </div>

            {message ? <p style={{ margin: "16px 0 0", color: palette.teal }}>{message}</p> : null}
          </PaperCard>
        </div>
      )}
    </MemberScaffold>
  );
}

function Brief({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <section style={{ marginTop: 16 }}>
      <p style={{ ...form.label, marginBottom: 4 }}>{label}</p>
      <p style={{ margin: 0, lineHeight: 1.65, color: palette.ink }}>{value}</p>
    </section>
  );
}

const gridStyle: React.CSSProperties = {
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
  margin: 0,
  fontFamily: palette.display,
  fontSize: 34,
  lineHeight: 1.1,
  fontWeight: 400,
  color: palette.ink,
};

const metaStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 13,
};
