"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

const ADMIN_EMAIL = "lois@sf-voice.sh";

// ─── shared style tokens ────────────────────────────────────────────────────

const t = {
  paper: "#F5EFE6",
  ivory: "#EFE7DC",
  fogBlue: "#DCE6EA",
  stone: "#5D5A57",
  ink: "#2B2A28",
  teal: "#8FAFB3",
  amber: "#D6B56D",
  lavender: "#B8AFC9",
  border: "rgba(93,90,87,0.14)",
  borderHard: "rgba(43,42,40,0.18)",
  display: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  body: "var(--font-inter), Inter, sans-serif",
  mono: "var(--font-ibm-mono, ui-monospace), 'IBM Plex Mono', monospace",
};

// ─── main page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const upsertUser = useMutation(api.users.upsertUser);
  const reviewApplication = useMutation(api.admin.reviewApplication);
  const inviteReferrer = useMutation(api.referrers.inviteReferrer);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const savePhoto = useMutation(api.photos.savePhoto);
  const saveSketch = useMutation(api.photos.saveSketch);
  const generateShareToken = useMutation(api.profile.generateShareToken);
  const generateSketchWithNanoBanana = useAction(
    api.photos.generateSketchWithNanoBanana,
  );

  const [acting, setActing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [portraitPhotoId, setPortraitPhotoId] = useState("");
  const [portraitPhotoStorageId, setPortraitPhotoStorageId] = useState("");
  const [portraitSketch, setPortraitSketch] = useState("");
  const [portraitStatus, setPortraitStatus] = useState("");
  const [portraitError, setPortraitError] = useState("");
  const [inviteContact, setInviteContact] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviteError, setInviteError] = useState("");

  const sessionEmail = session?.user?.email ?? "";
  const sessionName = session?.user?.name ?? undefined;
  const firstName = sessionName?.split(" ")[0] ?? sessionEmail.split("@")[0];
  const isAdmin = sessionEmail === ADMIN_EMAIL;

  const convexUser = useQuery(
    api.users.getMe,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const profile = useQuery(
    api.profile.getMyProfile,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const application = useQuery(
    api.applications.getMyApplication,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const referrers = useQuery(
    api.referrers.getMyReferrers,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const rewardPool = useQuery(
    api.rewardPools.getMyRewardPool,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const assets = useQuery(
    api.photos.getMyAssets,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const referrals = useQuery(
    api.referrals.getMyReferrals,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const applications = useQuery(
    api.admin.listApplications,
    isAdmin ? { email: sessionEmail, status: "submitted" } : "skip",
  );

  useEffect(() => {
    if (!sessionEmail) return;
    upsertUser({ email: sessionEmail, name: sessionName }).catch(console.error);
  }, [sessionEmail, sessionName, upsertUser]);

  if (status === "loading" || !sessionEmail || convexUser === undefined) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: t.paper,
        }}
      >
        <p style={{ fontFamily: t.body, fontSize: 13, color: t.stone }}>
          Loading…
        </p>
      </div>
    );
  }

  const displayedPortrait = portraitSketch || assets?.sketch?.url || "";
  const sourcePhotoId = portraitPhotoId || assets?.photo?._id || "";
  const sourcePhotoStorageId =
    portraitPhotoStorageId || assets?.photo?.storageId || "";
  const hasProfile = Boolean(profile?.displayName && profile?.city);
  const hasVoiceBrief = Boolean(profile?.voiceInterviewId);
  const hasSketch = Boolean(assets?.sketch);
  const currentShareToken = shareToken || profile?.shareToken || "";

  // 3-step setup flow
  const steps = [
    {
      num: 1,
      label: "Your profile",
      done: hasProfile && hasSketch,
      href: "/dashboard/profile",
      cta: hasProfile && hasSketch ? "Edit profile" : "Set up profile",
    },
    {
      num: 2,
      label: "Your intro brief",
      done: hasVoiceBrief,
      href: "/dashboard/voice",
      cta: hasVoiceBrief ? "Edit brief" : "Create brief",
    },
    {
      num: 3,
      label: "Share your profile",
      done: Boolean(currentShareToken),
      href: "#share",
      cta: currentShareToken ? "Copy share link" : "Generate share link",
    },
  ];
  const currentStep = steps.find((s) => !s.done) ?? steps[steps.length - 1];

  async function handleCopy() {
    try {
      const msg = "I'm using Sohoist for private introductions. If someone comes to mind who you genuinely think I'd click with, I'd love your referral.";
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  async function handleShareLink() {
    if (!sessionEmail) return;
    try {
      let token = currentShareToken;
      if (!token) {
        token = await generateShareToken({ email: sessionEmail });
        setShareToken(token);
      }
      const link = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(link);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2500);
    } catch {
      /* clipboard blocked */
    }
  }

  async function handleReview(
    applicationId: string,
    action: "approved" | "rejected" | "waitlisted" | "under_review",
  ) {
    setActing(applicationId + action);
    try {
      await reviewApplication({
        applicationId: applicationId as any,
        action,
        email: sessionEmail,
        notes: notesMap[applicationId],
      });
    } finally {
      setActing(null);
    }
  }

  async function handlePortraitUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file || !sessionEmail) return;

    setActing("portrait");
    setPortraitStatus("Uploading photo...");
    setPortraitError("");

    try {
      const uploadUrl = await generateUploadUrl();
      const storageId = await uploadPhoto(uploadUrl, file);
      const savedPhoto = await savePhoto({ storageId, email: sessionEmail });
      setPortraitPhotoId(savedPhoto._id);
      setPortraitPhotoStorageId(storageId);

      setPortraitStatus("Beautifying pencil sketch...");
      const generated = await generateSketchWithNanoBanana({
        photoStorageId: storageId,
        email: sessionEmail,
      });
      const savedSketch = await saveSketch({
        storageId: generated.storageId,
        sourcePhotoId: savedPhoto._id,
        style: "editorial_pencil",
        email: sessionEmail,
      });

      setPortraitSketch(savedSketch.url ?? generated.url ?? "");
      setPortraitStatus("Pencil sketch ready.");
    } catch (error) {
      setPortraitError(portraitFailureMessage(error));
      setPortraitStatus("");
    } finally {
      setActing(null);
      event.target.value = "";
    }
  }

  async function handlePortraitRegenerate() {
    if (!sourcePhotoStorageId || !sourcePhotoId || !sessionEmail || acting) return;

    setActing("portrait");
    setPortraitStatus("Beautifying pencil sketch...");
    setPortraitError("");

    try {
      const generated = await generateSketchWithNanoBanana({
        photoStorageId: sourcePhotoStorageId,
        email: sessionEmail,
      });
      const savedSketch = await saveSketch({
        storageId: generated.storageId,
        sourcePhotoId: sourcePhotoId as any,
        style: "editorial_pencil",
        email: sessionEmail,
      });

      setPortraitSketch(savedSketch.url ?? generated.url ?? "");
      setPortraitStatus("Pencil sketch ready.");
    } catch (error) {
      setPortraitError(portraitFailureMessage(error));
      setPortraitStatus("");
    } finally {
      setActing(null);
    }
  }

  async function handleInviteFriend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contact = inviteContact.trim();
    if (!contact || !sessionEmail || acting) return;

    setActing("invite");
    setInviteStatus("");
    setInviteError("");

    try {
      await inviteReferrer({
        sessionEmail,
        email: contact.includes("@") ? contact : undefined,
        phone: contact.includes("@") ? undefined : contact,
      });
      setInviteContact("");
      setInviteStatus("Invite saved to your trusted circle.");
    } catch {
      setInviteError("Couldn't invite this friend. Try again.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: t.paper }}>
      {/* ── header ──────────────────────────────────────────────────────────── */}
      <header
        className="max-w-[1180px] mx-auto flex justify-between items-center flex-wrap gap-3 px-4 sm:px-8 py-4 sm:py-5"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <div>
          <p
            style={{
              fontFamily: t.display,
              fontSize: 22,
              color: t.ink,
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            Sohoist
          </p>
          <p
            style={{
              fontFamily: t.body,
              fontSize: 9,
              letterSpacing: "1.4px",
              textTransform: "uppercase",
              color: t.stone,
              margin: "2px 0 0",
              opacity: 0.6,
            }}
          >
            Private Introductions
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <p
            className="truncate max-w-[120px] sm:max-w-none"
            style={{
              fontFamily: t.body,
              fontSize: 12,
              color: t.stone,
              margin: 0,
              opacity: 0.65,
            }}
          >
            {sessionEmail}
          </p>
          <button
            onClick={() => signOut({ redirectTo: "/" })}
            style={{
              fontFamily: t.body,
              fontSize: 12,
              color: t.stone,
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.55,
              padding: 0,
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── body ────────────────────────────────────────────────────────────── */}
      <main className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-16 sm:pb-20">
        {/* welcome line */}
        <p
          style={{
            fontFamily: t.body,
            fontSize: 11,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: t.teal,
            marginBottom: 8,
          }}
        >
          {isAdmin ? "Admin & Member" : "Member"}
        </p>
        <h1
          style={{
            fontFamily: t.display,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 400,
            color: t.ink,
            margin: "0 0 40px",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          {profile?.headline ?? `Welcome, ${firstName ?? "there"}.`}
        </h1>

        {/* ── 3-step progress ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <div style={s.card}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {steps.map((step) => {
                const isActive = step.num === currentStep.num;
                return (
                  <div
                    key={step.num}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 16px",
                      borderRadius: 14,
                      backgroundColor: isActive
                        ? "rgba(220,230,234,0.35)"
                        : step.done
                          ? "transparent"
                          : "transparent",
                      border: isActive
                        ? `1px solid ${t.teal}44`
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: step.done
                          ? t.teal
                          : isActive
                            ? t.ink
                            : "rgba(93,90,87,0.14)",
                        fontFamily: t.body,
                        fontSize: 11,
                        fontWeight: 500,
                        color: step.done || isActive ? t.paper : t.stone,
                      }}
                    >
                      {step.done ? "✓" : step.num}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        flex: 1,
                        fontFamily: t.body,
                        fontSize: 14,
                        color: step.done ? t.stone : t.ink,
                        opacity: step.done ? 0.65 : 1,
                        textDecoration: step.done ? "line-through" : "none",
                      }}
                    >
                      {step.label}
                    </p>
                    {isActive && (
                      step.num === 3 ? (
                        <button
                          onClick={handleShareLink}
                          style={{ ...s.primaryBtn, padding: "0 18px", height: 36, fontSize: 12 }}
                        >
                          {shareLinkCopied ? "Copied!" : currentShareToken ? "Copy link" : "Generate link"}
                        </button>
                      ) : (
                        <a
                          href={step.href}
                          style={{ ...s.primaryBtn, padding: "0 18px", height: 36, fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                        >
                          {step.cta}
                        </a>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── admin panel ─────────────────────────────────────────────────── */}
        {isAdmin && (
          <section style={{ marginBottom: 48 }}>
            <SectionHeader
              label="Pending Applications"
              detail={
                applications ? `${applications.length} awaiting review` : ""
              }
            />

            {applications === undefined ? (
              <p style={s.muted}>Loading applications…</p>
            ) : applications.length === 0 ? (
              <div style={s.emptyCard}>
                <p
                  style={{
                    fontFamily: t.display,
                    fontStyle: "italic",
                    fontSize: 18,
                    color: t.stone,
                    margin: 0,
                  }}
                >
                  All clear — no pending applications.
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {applications.map((app: any) => (
                  <div key={app._id} style={s.card}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontFamily: t.display,
                            fontSize: 20,
                            fontWeight: 400,
                            color: t.ink,
                            margin: 0,
                          }}
                        >
                          {app.pseudonym ?? app.name}
                        </p>
                        <p
                          style={{
                            fontFamily: t.body,
                            fontSize: 12,
                            color: t.stone,
                            margin: "3px 0 0",
                          }}
                        >
                          {app.city} · {app.profession}
                        </p>
                      </div>
                      <span
                        style={{
                          fontFamily: t.body,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          padding: "3px 10px",
                          borderRadius: 999,
                          backgroundColor: "rgba(214,181,109,0.15)",
                          color: "#8B6914",
                          border: "1px solid rgba(214,181,109,0.3)",
                        }}
                      >
                        Submitted
                      </span>
                    </div>

                    <div
                      style={{
                        height: 1,
                        backgroundColor: t.border,
                        marginBottom: 12,
                      }}
                    />

                    <p
                      style={{
                        fontFamily: t.body,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: t.stone,
                        opacity: 0.65,
                        margin: "0 0 4px",
                      }}
                    >
                      Why Sohoist
                    </p>
                    <p
                      style={{
                        fontFamily: t.body,
                        fontSize: 13,
                        color: t.ink,
                        lineHeight: 1.6,
                        margin: "0 0 12px",
                      }}
                    >
                      {app.whySohoist}
                    </p>

                    <p
                      style={{
                        fontFamily: t.body,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: t.stone,
                        opacity: 0.65,
                        margin: "0 0 4px",
                      }}
                    >
                      Relationship intent
                    </p>
                    <p
                      style={{
                        fontFamily: t.body,
                        fontSize: 13,
                        color: t.ink,
                        lineHeight: 1.6,
                        margin: "0 0 16px",
                      }}
                    >
                      {app.relationshipIntent}
                    </p>

                    <textarea
                      placeholder="Internal notes (optional)…"
                      value={notesMap[app._id] ?? ""}
                      onChange={(e) =>
                        setNotesMap((prev) => ({
                          ...prev,
                          [app._id]: e.target.value,
                        }))
                      }
                      rows={2}
                      style={{
                        width: "100%",
                        fontFamily: t.body,
                        fontSize: 12,
                        color: t.ink,
                        backgroundColor: "rgba(245,239,230,0.7)",
                        border: `1px solid ${t.border}`,
                        borderRadius: 10,
                        padding: "9px 13px",
                        marginBottom: 14,
                        resize: "vertical",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(
                        [
                          "approved",
                          "waitlisted",
                          "under_review",
                          "rejected",
                        ] as const
                      ).map((action) => {
                        const colors: Record<string, string> = {
                          approved: "#4CAF83",
                          waitlisted: t.lavender,
                          under_review: t.teal,
                          rejected: "#C0392B",
                        };
                        const labels: Record<string, string> = {
                          approved: "Approve",
                          waitlisted: "Waitlist",
                          under_review: "Under Review",
                          rejected: "Reject",
                        };
                        const isLoading = acting === app._id + action;
                        return (
                          <button
                            key={action}
                            onClick={() => handleReview(app._id, action)}
                            disabled={!!acting}
                            style={{
                              fontFamily: t.body,
                              fontSize: 12,
                              fontWeight: 500,
                              padding: "6px 16px",
                              borderRadius: 999,
                              border: `1px solid ${colors[action]}66`,
                              color:
                                acting && !isLoading ? "#ccc" : colors[action],
                              backgroundColor: "transparent",
                              cursor: acting ? "default" : "pointer",
                              opacity: acting && !isLoading ? 0.4 : 1,
                              transition: "opacity 0.15s",
                            }}
                          >
                            {isLoading ? "…" : labels[action]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── two-column layout on desktop ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* ── col 1: my profile ─────────────────────────────────────────── */}
          <section>
            <SectionHeader label="My Profile" />

            <div style={s.card}>
              {/* photo upload + Nano Banana sketch preview */}
              <div
                style={{
                  minHeight: displayedPortrait ? 0 : 180,
                  borderRadius: 14,
                  marginBottom: 16,
                  backgroundColor: displayedPortrait
                    ? "rgba(245,239,230,0.72)"
                    : "rgba(220,230,234,0.4)",
                  border: displayedPortrait
                    ? `1px solid ${t.border}`
                    : `1px dashed ${t.borderHard}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  overflow: "hidden",
                  position: "relative",
                  padding: displayedPortrait ? 0 : undefined,
                }}
              >
                {displayedPortrait ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayedPortrait}
                      alt="Generated pencil portrait"
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: 560,
                        objectFit: "contain",
                        display: "block",
                        backgroundColor: "rgba(245,239,230,0.72)",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        bottom: 12,
                        fontFamily: t.body,
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: t.stone,
                        backgroundColor: "rgba(245,239,230,0.86)",
                        borderRadius: 999,
                        padding: "4px 9px",
                      }}
                    >
                      Pencil portrait
                    </span>
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        fontFamily: t.display,
                        fontStyle: "italic",
                        fontSize: 36,
                        margin: 0,
                        opacity: 0.3,
                      }}
                    >
                      Pencil
                    </p>
                    <p
                      style={{
                        fontFamily: t.body,
                        fontSize: 12,
                        color: t.stone,
                        margin: 0,
                      }}
                    >
                      Pencil portrait
                    </p>
                  </>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: portraitStatus || portraitError ? 8 : 16,
                }}
              >
                <label
                  style={{
                    fontFamily: t.body,
                    fontSize: 12,
                    fontWeight: 500,
                    color: t.teal,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {displayedPortrait ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={acting === "portrait"}
                    onChange={handlePortraitUpload}
                  />
                </label>
                {sourcePhotoStorageId && (
                  <button
                    type="button"
                    onClick={handlePortraitRegenerate}
                    disabled={acting === "portrait"}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: t.stone,
                      fontFamily: t.body,
                      fontSize: 12,
                      cursor: acting === "portrait" ? "default" : "pointer",
                      opacity: acting === "portrait" ? 0.45 : 1,
                      padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    {acting === "portrait" ? "Generating..." : "Regenerate sketch"}
                  </button>
                )}
              </div>
              {portraitStatus && (
                <p style={{ ...s.muted, textAlign: "center", marginBottom: 12 }}>
                  {portraitStatus}
                </p>
              )}
              {portraitError && (
                <p
                  style={{
                    fontFamily: t.body,
                    fontSize: 12,
                    color: "#9B352B",
                    textAlign: "center",
                    margin: "0 0 12px",
                  }}
                >
                  {portraitError}
                </p>
              )}

              {/* profile content */}
              {profile ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: t.display,
                          fontSize: 22,
                          color: t.ink,
                          margin: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        {profile.headline ?? `${firstName ?? "Your"} profile`}
                      </p>
                      {profile.city || profile.profession ? (
                        <p
                          style={{
                            fontFamily: t.body,
                            fontSize: 12,
                            color: t.stone,
                            margin: "3px 0 0",
                          }}
                        >
                          {[profile.profession, profile.city]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <GhostBadge active={profile.ghostMode} />
                  </div>

                  {profile.tags && profile.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 12,
                      }}
                    >
                      {profile.tags.slice(0, 5).map((tag: string) => (
                        <span key={tag} style={s.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      height: 1,
                      backgroundColor: t.border,
                      margin: "12px 0",
                    }}
                  />

                  {profile.bio ? (
                    <p
                      style={{
                        fontFamily: t.display,
                        fontStyle: "italic",
                        fontSize: 15,
                        color: t.ink,
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {profile.bio}
                    </p>
                  ) : (
                    <p
                      style={{
                        fontFamily: t.body,
                        fontSize: 13,
                        color: t.stone,
                        opacity: 0.6,
                        margin: 0,
                      }}
                    >
                      Complete your voice profile to fill this in.
                    </p>
                  )}
                </>
              ) : (
                <p
                  style={{
                    fontFamily: t.body,
                    fontSize: 13,
                    color: t.stone,
                    margin: 0,
                  }}
                >
                  Profile not yet created.
                </p>
              )}

              {/* share button */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={handleCopy}
                  style={{
                    ...s.primaryBtn,
                    width: "100%",
                    textAlign: "center",
                    backgroundColor: copied ? "#4CAF83" : t.ink,
                    transition: "background-color 0.2s",
                  }}
                >
                  {copied ? "Copied!" : "Copy invite note"}
                </button>
                <a
                  href="/dashboard/shared-preview"
                  style={{
                    ...s.primaryBtn,
                    width: "100%",
                    textAlign: "center",
                    lineHeight: "48px",
                    backgroundColor: "transparent",
                    color: t.ink,
                    border: `1px solid ${t.borderHard}`,
                    textDecoration: "none",
                  }}
                >
                  Preview share
                </a>
                <a
                  href="/dashboard/photo"
                  style={{
                    ...s.primaryBtn,
                    width: "100%",
                    textAlign: "center",
                    lineHeight: "48px",
                    backgroundColor: "transparent",
                    color: t.ink,
                    border: `1px solid ${t.borderHard}`,
                    textDecoration: "none",
                  }}
                >
                  Add portrait
                </a>
              </div>

              <p
                style={{
                  fontFamily: t.body,
                  fontSize: 11,
                  color: t.stone,
                  opacity: 0.5,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                Create private links from the trusted circle screen.
              </p>
            </div>
          </section>

          {/* ── col 2: my circle (referrers) ──────────────────────────────── */}
          <section>
            <SectionHeader
              label="My Circle"
              detail={
                referrers
                  ? `${referrers.length} ${referrers.length === 1 ? "person" : "people"}`
                  : ""
              }
            />

            {referrers === undefined ? (
              <p style={s.muted}>Loading…</p>
            ) : !referrers || referrers.length === 0 ? (
              <div style={s.emptyCard}>
                <p
                  style={{
                    fontFamily: t.display,
                    fontStyle: "italic",
                    fontSize: 18,
                    color: t.stone,
                    margin: "0 0 12px",
                  }}
                >
                  No one invited yet.
                </p>
                <p
                  style={{
                    fontFamily: t.body,
                    fontSize: 13,
                    color: t.stone,
                    opacity: 0.7,
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  Invite trusted friends who know your taste and who you&apos;d
                  actually click with.
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {referrers.map((r: any) => (
                  <div key={r._id} style={{ ...s.card, padding: "14px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: t.body,
                          fontSize: 14,
                          fontWeight: 500,
                          color: t.ink,
                          margin: 0,
                        }}
                      >
                        {r.email ?? r.phone ?? "Unnamed"}
                      </p>
                      <ReferrerStatusBadge status={r.status} />
                    </div>
                    {r.referrerId && (
                      <p
                        style={{
                          fontFamily: t.body,
                          fontSize: 11,
                          color: t.stone,
                          margin: "4px 0 0",
                          opacity: 0.6,
                        }}
                      >
                        Accepted the invite
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleInviteFriend}
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
              }}
            >
              <input
                value={inviteContact}
                onChange={(event) => {
                  setInviteContact(event.target.value);
                  setInviteStatus("");
                  setInviteError("");
                }}
                placeholder="friend@example.com"
                aria-label="Friend email or phone"
                style={{
                  fontFamily: t.body,
                  fontSize: 13,
                  color: t.ink,
                  backgroundColor: "rgba(245,239,230,0.7)",
                  border: `1px solid ${t.border}`,
                  borderRadius: 999,
                  padding: "0 14px",
                  height: 40,
                  minWidth: 0,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="submit"
                disabled={!inviteContact.trim() || acting === "invite"}
                style={{
                  fontFamily: t.body,
                  fontSize: 13,
                  fontWeight: 500,
                  color: t.paper,
                  backgroundColor: t.ink,
                  border: "none",
                  borderRadius: 999,
                  padding: "0 16px",
                  height: 40,
                  cursor:
                    inviteContact.trim() && acting !== "invite"
                      ? "pointer"
                      : "default",
                  opacity: inviteContact.trim() && acting !== "invite" ? 1 : 0.45,
                }}
              >
                {acting === "invite" ? "Inviting..." : "Invite"}
              </button>
            </form>
            {inviteStatus && (
              <p style={{ ...s.muted, marginTop: 8 }}>{inviteStatus}</p>
            )}
            {inviteError && (
              <p
                style={{
                  fontFamily: t.body,
                  fontSize: 12,
                  color: "#9B352B",
                  margin: "8px 0 0",
                }}
              >
                {inviteError}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

async function uploadPhoto(uploadUrl: string, file: File) {
  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!result.ok) throw new Error("Photo upload failed");

  const body = (await result.json()) as { storageId?: string };
  if (!body.storageId) throw new Error("Photo upload did not return storage");
  return body.storageId;
}

function portraitFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("GEMINI_API_KEY")) {
    return "Nano Banana is not configured yet. Set GEMINI_API_KEY in Convex env.";
  }
  if (message.includes("Photo upload")) {
    return "Couldn't upload this photo. Try a smaller image.";
  }
  if (message.includes("did not return an image")) {
    return "Nano Banana did not return a sketch. Try another portrait.";
  }
  return "Couldn't create the Nano Banana sketch. Try another photo.";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${t.border}`,
        backgroundColor: "rgba(245,239,230,0.46)",
        padding: "12px 14px",
      }}
    >
      <p
        style={{
          fontFamily: t.mono,
          fontSize: 18,
          color: t.ink,
          margin: "0 0 2px",
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: t.body,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: t.stone,
          margin: 0,
        }}
      >
        {label}
      </p>
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ label, detail }: { label: string; detail?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 14,
      }}
    >
      <p
        style={{
          fontFamily: t.body,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: t.stone,
          margin: 0,
        }}
      >
        {label}
      </p>
      {detail && (
        <p
          style={{
            fontFamily: t.mono,
            fontSize: 11,
            color: t.stone,
            opacity: 0.55,
            margin: 0,
          }}
        >
          {detail}
        </p>
      )}
    </div>
  );
}

function GhostBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span
      style={{
        fontFamily: t.body,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        padding: "3px 10px",
        borderRadius: 999,
        backgroundColor: "rgba(220,230,234,0.72)",
        border: "1px solid rgba(93,90,87,0.12)",
        color: t.stone,
      }}
    >
      Ghost mode
    </span>
  );
}

const REFERRER_STATUS_STYLE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  invited: { bg: "rgba(220,230,234,0.6)", color: t.stone, label: "Invited" },
  accepted: {
    bg: "rgba(214,181,109,0.15)",
    color: "#7A5C14",
    label: "Accepted",
  },
  approved: {
    bg: "rgba(143,175,179,0.2)",
    color: "#3D7A7E",
    label: "Approved",
  },
  removed: { bg: "rgba(93,90,87,0.08)", color: t.stone, label: "Removed" },
};

function ReferrerStatusBadge({ status }: { status: string }) {
  const style = REFERRER_STATUS_STYLE[status] ?? REFERRER_STATUS_STYLE.invited;
  return (
    <span
      style={{
        fontFamily: t.body,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        padding: "3px 10px",
        borderRadius: 999,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.color}33`,
      }}
    >
      {style.label}
    </span>
  );
}

// ─── style constants ─────────────────────────────────────────────────────────

const s = {
  card: {
    backgroundColor: "#EFE7DC",
    borderRadius: 20,
    border: "1px solid rgba(120,100,75,0.14)",
    padding: 20,
    boxShadow: "0 12px 40px rgba(70,50,30,0.08)",
  } as React.CSSProperties,

  emptyCard: {
    backgroundColor: "rgba(220,230,234,0.25)",
    borderRadius: 20,
    border: "1px dashed rgba(93,90,87,0.18)",
    padding: 24,
  } as React.CSSProperties,

  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 999,
    backgroundColor: t.ink,
    color: t.paper,
    border: "none",
    fontFamily: t.body,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    letterSpacing: "0.01em",
    textAlign: "center",
    textDecoration: "none",
  } as React.CSSProperties,

  tag: {
    fontFamily: t.body,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.5px",
    padding: "3px 10px",
    borderRadius: 999,
    backgroundColor: "rgba(220,230,234,0.72)",
    border: "1px solid rgba(93,90,87,0.10)",
    color: t.stone,
  } as React.CSSProperties,

  muted: {
    fontFamily: t.body,
    fontSize: 13,
    color: t.stone,
    opacity: 0.55,
    margin: 0,
  } as React.CSSProperties,
} as const;
