"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

const ADMIN_EMAIL = "lois@sf-voice.sh";
const PORTRAIT_STORAGE_PREFIX = "sohoist:web:pencilPortrait";

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

  const [acting, setActing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [portraitOriginal, setPortraitOriginal] = useState("");
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
  const referrers = useQuery(
    api.referrers.getMyReferrers,
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

  const shareUrl = `https://sohoist.app/member/${convexUser?._id ?? ""}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

    setPortraitStatus("Creating pencil sketch...");
    setPortraitError("");

    try {
      const original = await readFileAsDataUrl(file);
      const sketch = await createPencilSketch(original);
      setPortraitOriginal(original);
      setPortraitSketch(sketch);
      localStorage.setItem(
        `${PORTRAIT_STORAGE_PREFIX}:${sessionEmail}`,
        JSON.stringify({ original, sketch }),
      );
      setPortraitStatus("Pencil sketch ready.");
    } catch {
      setPortraitError("Couldn't create the sketch. Try a smaller image.");
      setPortraitStatus("");
    } finally {
      event.target.value = "";
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
        style={{
          borderBottom: `1px solid ${t.border}`,
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1180,
          margin: "0 auto",
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
      <main
        style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 32px 80px" }}
      >
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
                {applications.map((app) => (
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── col 1: my profile ─────────────────────────────────────────── */}
          <section>
            <SectionHeader label="My Profile" />

            <div style={s.card}>
              {/* photo upload + browser-side sketch preview */}
              <div
                style={{
                  height: 180,
                  borderRadius: 14,
                  marginBottom: 16,
                  backgroundColor: portraitSketch
                    ? "rgba(245,239,230,0.72)"
                    : "rgba(220,230,234,0.4)",
                  border: portraitSketch
                    ? `1px solid ${t.border}`
                    : `1px dashed ${t.borderHard}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {portraitSketch ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={portraitSketch}
                      alt="Generated pencil portrait"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
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
                  {portraitSketch ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePortraitUpload}
                  />
                </label>
                {portraitOriginal && (
                  <button
                    type="button"
                    onClick={async () => {
                      setPortraitStatus("Regenerating sketch...");
                      setPortraitError("");
                      try {
                        const sketch = await createPencilSketch(portraitOriginal);
                        setPortraitSketch(sketch);
                        localStorage.setItem(
                          `${PORTRAIT_STORAGE_PREFIX}:${sessionEmail}`,
                          JSON.stringify({ original: portraitOriginal, sketch }),
                        );
                        setPortraitStatus("Pencil sketch ready.");
                      } catch {
                        setPortraitError("Couldn't regenerate the sketch.");
                        setPortraitStatus("");
                      }
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: t.stone,
                      fontFamily: t.body,
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Regenerate sketch
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
              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    ...s.primaryBtn,
                    flex: 1,
                    backgroundColor: copied ? "#4CAF83" : t.ink,
                    transition: "background-color 0.2s",
                  }}
                >
                  {copied ? "Copied!" : "Share my profile →"}
                </button>
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
                Only people with the link can view your profile.
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
            ) : referrers.length === 0 ? (
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Invalid file result"));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function loadBrowserImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = src;
  });
}

async function createPencilSketch(src: string) {
  const image = await loadBrowserImage(src);
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const luminance = new Uint8ClampedArray(width * height);

  for (let i = 0; i < data.length; i += 4) {
    luminance[i / 4] = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114,
    );
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const right = luminance[y * width + Math.min(width - 1, x + 1)];
      const down = luminance[Math.min(height - 1, y + 1) * width + x];
      const edge =
        Math.abs(luminance[index] - right) + Math.abs(luminance[index] - down);
      const shade = Math.max(34, 245 - edge * 3.4 - (255 - luminance[index]) * 0.18);
      const warm = Math.round(shade);
      const offset = index * 4;
      data[offset] = warm;
      data[offset + 1] = Math.max(0, warm - 3);
      data[offset + 2] = Math.max(0, warm - 9);
      data[offset + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.strokeStyle = "rgba(43,42,40,0.11)";
  ctx.lineWidth = 0.8;
  for (let y = 8; y < height; y += 13) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.sin(y) * 3);
    ctx.stroke();
  }

  return canvas.toDataURL("image/jpeg", 0.9);
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
    display: "block",
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
