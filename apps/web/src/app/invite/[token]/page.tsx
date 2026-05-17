"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
import logoMark from "../../../../public/images/logo.png";
import noteImage from "../../../../public/images/region-01.png";
import portraitFallback from "../../../../public/images/region-02.png";

export default function InviteTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";

  const profile = useQuery(
    api.sharing.getProfileByToken,
    token ? { token } : "skip",
  );
  const acceptInvite = useMutation(api.referrers.acceptReferrerInvite);
  const submitReferral = useMutation(api.referrals.submitReferral);

  const [accepted, setAccepted] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateContact, setCandidateContact] = useState("");
  const [candidateCity, setCandidateCity] = useState("");
  const [whyAFit, setWhyAFit] = useState("");
  const [howKnown, setHowKnown] = useState("");
  const [candidateKnows, setCandidateKnows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAccept() {
    if (!sessionEmail || !token) return;
    setSaving(true);
    setError("");
    try {
      await acceptInvite({ token, email: sessionEmail });
      setAccepted(true);
      setMessage("Invite accepted. The member can now approve you as a referrer.");
    } catch {
      setError("Couldn't accept this invite. It may already be accepted.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitReferral(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !sessionEmail) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await submitReferral({
        email: sessionEmail,
        memberId: profile.memberId,
        candidateName,
        candidateContact,
        candidateCity: candidateCity || undefined,
        whyAFit,
        howReferrerKnowsThem: howKnown,
        confidenceLevel: "medium",
        candidateKnowsAboutIntro: candidateKnows,
      });
      setCandidateName("");
      setCandidateContact("");
      setCandidateCity("");
      setWhyAFit("");
      setHowKnown("");
      setCandidateKnows(false);
      setMessage("Referral submitted.");
    } catch {
      setError(
        "Couldn't submit yet. The member may need to approve you as a referrer first.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <MemberScaffold
      eyebrow="Private invitation"
      title={
        profile
          ? `${profile.memberName} is open to thoughtful introductions.`
          : "Private invitation"
      }
      subtitle="View the private intro brief, then make a referral only if someone genuinely comes to mind."
    >
      {profile === undefined ? (
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        </PaperCard>
      ) : !profile ? (
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>
            This private link is unavailable or has been revoked.
          </p>
        </PaperCard>
      ) : (
        <div style={gridStyle}>
          <PaperCard>
            {profile.sketchUrl ? (
              <Image
                src={profile.sketchUrl}
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

          <div style={{ display: "grid", gap: 22 }}>
            <PaperCard>
              <SectionHeading
                label="Intro brief"
                detail={<StatusBadge>{profile.referrerStatus}</StatusBadge>}
              />
              <div style={brandStyle}>
                <Image src={logoMark} alt="" style={logoStyle} priority />
                <span>Private intro brief</span>
              </div>
              <h2 style={headlineStyle}>{profile.bio ?? "Private by default."}</h2>
              <p style={metaStyle}>
                {[profile.profession, profile.city, profile.relationshipIntent]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {profile.tags.length ? (
                <div style={tagsStyle}>
                  {profile.tags.map((tag: string) => (
                    <StatusBadge key={tag}>{tag}</StatusBadge>
                  ))}
                </div>
              ) : null}
              {profile.reward ? (
                <div style={rewardStyle}>
                  <span>{profile.reward.label}</span>
                  <small>
                    Releases after a mutually confirmed six-month relationship.
                  </small>
                </div>
              ) : null}
              <Brief label="Open to meeting" value={profile.openTo} />
              <Brief
                label="Friends should refer someone who"
                value={profile.friendsShouldReferSomeoneWho}
              />
              <Brief label="Do not refer if" value={profile.doNotReferIf} />
              <Brief
                label="Private note"
                value={profile.privateNotesForReferrers}
              />

              <Image src={noteImage} alt="" style={noteStyle} />

              {!sessionEmail ? (
                <Link
                  href={`/sign-in?callbackUrl=/invite/${token}`}
                  style={form.primary}
                >
                  Sign in to accept invite
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={saving || accepted}
                  style={form.primary}
                >
                  {accepted ? "Invite accepted" : "Accept referrer invite"}
                </button>
              )}
            </PaperCard>

            <PaperCard>
              <SectionHeading label="Make a thoughtful referral" />
              <p style={termsTextStyle}>
                Submit only if you genuinely know both the person and the
                context. Sohoist introductions are private, signed-in, and
                revocable by the member.
              </p>
              <form onSubmit={handleSubmitReferral} style={form.grid}>
                <label>
                  <span style={form.label}>Candidate name</span>
                  <input
                    value={candidateName}
                    onChange={(event) => setCandidateName(event.target.value)}
                    style={form.input}
                    required
                  />
                </label>
                <label>
                  <span style={form.label}>Candidate contact</span>
                  <input
                    value={candidateContact}
                    onChange={(event) => setCandidateContact(event.target.value)}
                    placeholder="Email or phone"
                    style={form.input}
                    required
                  />
                </label>
                <label>
                  <span style={form.label}>Candidate city</span>
                  <input
                    value={candidateCity}
                    onChange={(event) => setCandidateCity(event.target.value)}
                    style={form.input}
                  />
                </label>
                <label>
                  <span style={form.label}>Why they might click</span>
                  <textarea
                    value={whyAFit}
                    onChange={(event) => setWhyAFit(event.target.value)}
                    style={form.textarea}
                    required
                  />
                </label>
                <label>
                  <span style={form.label}>How you know them</span>
                  <textarea
                    value={howKnown}
                    onChange={(event) => setHowKnown(event.target.value)}
                    style={form.textarea}
                    required
                  />
                </label>
                <label style={checkStyle}>
                  <input
                    type="checkbox"
                    checked={candidateKnows}
                    onChange={(event) => setCandidateKnows(event.target.checked)}
                  />
                  Candidate knows about this possible intro.
                </label>
                {message ? <p style={{ margin: 0, color: palette.teal }}>{message}</p> : null}
                {error ? <p style={form.error}>{error}</p> : null}
                <button type="submit" style={form.primary} disabled={saving || !sessionEmail}>
                  Submit referral
                </button>
              </form>
            </PaperCard>
          </div>
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
  fontSize: 32,
  lineHeight: 1.2,
  fontWeight: 400,
  color: palette.ink,
};

const metaStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 13,
};

const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 13,
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const logoStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  objectFit: "cover",
};

const tagsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 14,
};

const rewardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(214,181,109,0.14)",
  padding: 14,
  display: "grid",
  gap: 3,
  color: palette.ink,
  fontFamily: palette.body,
  fontSize: 14,
  marginTop: 18,
};

const noteStyle: React.CSSProperties = {
  width: "100%",
  height: 116,
  objectFit: "cover",
  borderRadius: 16,
  display: "block",
  marginTop: 18,
};

const termsTextStyle: React.CSSProperties = {
  margin: "0 0 16px",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 13,
  lineHeight: 1.7,
};
