"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { type Doc } from "@packages/backend/convex/_generated/dataModel";

const ADMIN_EMAIL = "lois@sf-voice.sh";

type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "waitlisted"
  | "rejected";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  submitted: "#D6B56D",
  under_review: "#8FAFB3",
  approved: "#4CAF83",
  waitlisted: "#B8AFC9",
  rejected: "#C0392B",
};

const STATUS_TABS: { label: string; value: ApplicationStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Submitted", value: "submitted" },
  { label: "Under Review", value: "under_review" },
  { label: "Waitlisted", value: "waitlisted" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const upsertUser = useMutation(api.users.upsertUser);
  const reviewApplication = useMutation(api.admin.reviewApplication);

  const [activeTab, setActiveTab] = useState<ApplicationStatus | undefined>(
    undefined,
  );
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const sessionEmail = session?.user?.email ?? "";
  const isAdmin = sessionEmail === ADMIN_EMAIL;

  const applications = useQuery(
    api.admin.listApplications,
    isAdmin ? { email: sessionEmail, status: activeTab } : "skip",
  );

  useEffect(() => {
    if (!sessionEmail) return;
    upsertUser({
      email: sessionEmail,
      name: session?.user?.name ?? undefined,
    }).catch(console.error);
  }, [sessionEmail, session?.user?.name, upsertUser]);

  if (status === "loading") {
    return (
      <div style={styles.loading}>
        <p style={styles.loadingText}>Loading…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.denied}>
        <p style={styles.deniedText}>Access restricted.</p>
      </div>
    );
  }

  const handleAction = async (
    applicationId: string,
    action: "approved" | "rejected" | "waitlisted" | "under_review",
  ) => {
    setActing(applicationId + action);
    try {
      await reviewApplication({
        applicationId: applicationId as any,
        action,
        email: sessionEmail,
        notes: reviewNotes[applicationId],
      });
    } finally {
      setActing(null);
    }
  };

  return (
    <div style={styles.page}>
      {/* header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.wordmark}>Sohoist</h1>
          <p style={styles.wordmarkLabel}>CONCIERGE ADMIN</p>
        </div>
        <p style={styles.adminEmail}>{sessionEmail}</p>
      </div>

      {/* tabs */}
      <div style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.value)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.value ? styles.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* application list */}
      {applications === undefined ? (
        <p style={styles.loadingText}>Loading applications…</p>
      ) : applications.length === 0 ? (
        <p style={styles.emptyText}>No applications found.</p>
      ) : (
        <div style={styles.list}>
          {applications.map((app: any) => (
            <div key={app._id} style={styles.card}>
              {/* top row */}
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.applicantName}>{app.name}</p>
                  <p style={styles.applicantMeta}>
                    {app.city} · {app.profession}
                  </p>
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      STATUS_COLORS[app.status as ApplicationStatus] + "22",
                    color: STATUS_COLORS[app.status as ApplicationStatus],
                    borderColor:
                      STATUS_COLORS[app.status as ApplicationStatus] + "44",
                  }}
                >
                  {app.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* divider */}
              <div style={styles.divider} />

              {/* fields */}
              <div style={styles.field}>
                <p style={styles.fieldLabel}>Relationship intent</p>
                <p style={styles.fieldValue}>{app.relationshipIntent}</p>
              </div>
              <div style={styles.field}>
                <p style={styles.fieldLabel}>Why Sohoist</p>
                <p style={styles.fieldValue}>{app.whySohoist}</p>
              </div>
              <div style={styles.field}>
                <p style={styles.fieldLabel}>Submitted</p>
                <p style={styles.fieldValue}>
                  {new Date(app.submittedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* review notes */}
              <textarea
                style={styles.notesInput}
                placeholder="Internal review notes (optional)…"
                value={reviewNotes[app._id] ?? ""}
                onChange={(e) =>
                  setReviewNotes((prev) => ({
                    ...prev,
                    [app._id]: e.target.value,
                  }))
                }
                rows={2}
              />

              {/* action buttons */}
              <div style={styles.actions}>
                <ActionButton
                  label="Approve"
                  color="#4CAF83"
                  disabled={app.status === "approved" || !!acting}
                  loading={acting === app._id + "approved"}
                  onClick={() => handleAction(app._id, "approved")}
                />
                <ActionButton
                  label="Waitlist"
                  color="#B8AFC9"
                  disabled={app.status === "waitlisted" || !!acting}
                  loading={acting === app._id + "waitlisted"}
                  onClick={() => handleAction(app._id, "waitlisted")}
                />
                <ActionButton
                  label="Under Review"
                  color="#8FAFB3"
                  disabled={app.status === "under_review" || !!acting}
                  loading={acting === app._id + "under_review"}
                  onClick={() => handleAction(app._id, "under_review")}
                />
                <ActionButton
                  label="Reject"
                  color="#C0392B"
                  disabled={app.status === "rejected" || !!acting}
                  loading={acting === app._id + "rejected"}
                  onClick={() => handleAction(app._id, "rejected")}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  color,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  color: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles.actionButton,
        borderColor: color + "66",
        color: disabled ? "#ccc" : color,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {loading ? "…" : label}
    </button>
  );
}

// inline styles — keeps the admin panel self-contained and dependency-free
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#F5EFE6",
    padding: "40px 32px",
    fontFamily: "var(--font-inter), Inter, sans-serif",
    maxWidth: 900,
    margin: "0 auto",
  } as React.CSSProperties,
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#F5EFE6",
  } as React.CSSProperties,
  loadingText: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 14,
    color: "#5D5A57",
  } as React.CSSProperties,
  denied: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#F5EFE6",
  } as React.CSSProperties,
  deniedText: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 14,
    color: "#5D5A57",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  } as React.CSSProperties,
  wordmark: {
    fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
    fontWeight: 400,
    fontSize: 28,
    color: "#2B2A28",
    margin: 0,
    letterSpacing: "-0.3px",
  } as React.CSSProperties,
  wordmarkLabel: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 10,
    letterSpacing: "1.4px",
    color: "#5D5A57",
    margin: "2px 0 0 0",
  } as React.CSSProperties,
  adminEmail: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 12,
    color: "#5D5A57",
    opacity: 0.65,
    margin: 0,
  } as React.CSSProperties,
  tabs: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    flexWrap: "wrap",
  } as React.CSSProperties,
  tab: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 12,
    letterSpacing: "0.5px",
    padding: "6px 14px",
    borderRadius: 999,
    border: "1px solid rgba(93, 90, 87, 0.22)",
    backgroundColor: "transparent",
    color: "#5D5A57",
    cursor: "pointer",
    transition: "all 0.15s",
  } as React.CSSProperties,
  tabActive: {
    backgroundColor: "#2B2A28",
    color: "#F5EFE6",
    borderColor: "#2B2A28",
  } as React.CSSProperties,
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  } as React.CSSProperties,
  card: {
    backgroundColor: "#EFE7DC",
    borderRadius: 20,
    border: "1px solid rgba(120, 100, 75, 0.14)",
    padding: 24,
    boxShadow: "0 12px 40px rgba(70, 50, 30, 0.08)",
  } as React.CSSProperties,
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  } as React.CSSProperties,
  applicantName: {
    fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
    fontSize: 22,
    fontWeight: 400,
    color: "#2B2A28",
    margin: 0,
    letterSpacing: "-0.3px",
  } as React.CSSProperties,
  applicantMeta: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 13,
    color: "#5D5A57",
    margin: "4px 0 0 0",
  } as React.CSSProperties,
  statusBadge: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.5px",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  divider: {
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.14)",
    marginBottom: 16,
  } as React.CSSProperties,
  field: {
    marginBottom: 12,
  } as React.CSSProperties,
  fieldLabel: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: "#5D5A57",
    margin: "0 0 4px 0",
    opacity: 0.7,
  } as React.CSSProperties,
  fieldValue: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 14,
    color: "#2B2A28",
    lineHeight: "1.55",
    margin: 0,
  } as React.CSSProperties,
  notesInput: {
    width: "100%",
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 13,
    color: "#2B2A28",
    backgroundColor: "rgba(245, 239, 230, 0.7)",
    border: "1px solid rgba(93, 90, 87, 0.18)",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 16,
    resize: "vertical",
    boxSizing: "border-box",
    outline: "none",
  } as React.CSSProperties,
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  } as React.CSSProperties,
  actionButton: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 12,
    fontWeight: 500,
    padding: "7px 16px",
    borderRadius: 999,
    border: "1px solid",
    backgroundColor: "transparent",
    transition: "all 0.15s",
  } as React.CSSProperties,
  emptyText: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: 14,
    color: "#5D5A57",
    opacity: 0.6,
  } as React.CSSProperties,
} as const;
