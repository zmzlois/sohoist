import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { colors, components, fonts, radius, spacing, shadow } from "../theme";
import { useNativeAuth } from "../auth";

const ADMIN_EMAIL =
  process.env.EXPO_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ??
  "lois@sf-voice.sh";

type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "waitlisted"
  | "rejected";

const STATUS_TABS: { label: string; value?: ApplicationStatus }[] = [
  { label: "All" },
  { label: "Submitted", value: "submitted" },
  { label: "Review", value: "under_review" },
  { label: "Waitlist", value: "waitlisted" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  submitted: colors.warmAmber,
  under_review: colors.mutedTeal,
  approved: "#4CAF83",
  waitlisted: colors.dustLavender,
  rejected: "#C0392B",
};

const ACTIONS: {
  label: string;
  value: Exclude<ApplicationStatus, "submitted">;
}[] = [
  { label: "Approve", value: "approved" },
  { label: "Waitlist", value: "waitlisted" },
  { label: "Review", value: "under_review" },
  { label: "Reject", value: "rejected" },
];

function normalizeStatus(value: string) {
  return value.replace(/_/g, " ");
}

export default function AdminScreen() {
  const router = useRouter();
  const { signOut, user } = useNativeAuth();
  const reviewApplication = useMutation(api.admin.reviewApplication);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | undefined>();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState("");

  const email = user?.email.trim().toLowerCase() ?? "";
  const isAdmin = email === ADMIN_EMAIL;
  const applications = useQuery(
    api.admin.listApplications,
    isAdmin ? { email, status: activeTab } : "skip",
  );

  async function handleReview(
    applicationId: Id<"membershipApplications">,
    action: Exclude<ApplicationStatus, "submitted">,
  ) {
    if (!email) return;
    const actionKey = `${applicationId}:${action}`;
    setActing(actionKey);
    try {
      await reviewApplication({
        applicationId,
        action,
        email,
        notes: notes[applicationId],
      });
    } finally {
      setActing("");
    }
  }

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.deniedTitle}>Access restricted.</Text>
        <Text style={styles.deniedBody}>
          The concierge panel is only available to the admin account.
        </Text>
        <TouchableOpacity
          style={[components.secondaryButton, styles.centerButton]}
          onPress={() => signOut()}
          activeOpacity={0.75}
        >
          <Text style={components.secondaryButtonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>Sohoist</Text>
          <Text style={styles.wordmarkLabel}>CONCIERGE ADMIN</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.replace("/home")}
            activeOpacity={0.7}
            style={styles.headerActionButton}
          >
            <Text style={styles.headerActionText}>Member home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => signOut()}
            activeOpacity={0.7}
            style={styles.headerActionButton}
          >
            <Text style={styles.headerActionText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Signed in as</Text>
        <Text style={styles.summaryEmail}>{email}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.value)}
              activeOpacity={0.72}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {applications === undefined ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.mutedTeal} />
          <Text style={styles.loadingText}>Loading applications…</Text>
        </View>
      ) : applications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>All clear.</Text>
          <Text style={styles.emptyBody}>No applications match this view.</Text>
        </View>
      ) : (
        applications.map((application) => {
          const tone =
            STATUS_COLORS[application.status as ApplicationStatus] ??
            colors.stone;
          return (
            <View key={application._id} style={styles.applicationCard}>
              <View style={styles.cardHeader}>
                <View style={styles.applicantCopy}>
                  <Text style={styles.applicantName}>{application.name}</Text>
                  <Text style={styles.applicantMeta}>
                    {application.city} · {application.profession}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      borderColor: `${tone}44`,
                      backgroundColor: `${tone}18`,
                    },
                  ]}
                >
                  <Text style={[styles.statusText, { color: tone }]}>
                    {normalizeStatus(application.status)}
                  </Text>
                </View>
              </View>

              <View style={components.divider} />

              <Detail label="Intent" value={application.relationshipIntent} />
              <Detail label="Why Sohoist" value={application.whySohoist} />
              <Detail
                label="Submitted"
                value={new Date(application.submittedAt).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              />

              <TextInput
                style={styles.notesInput}
                value={notes[application._id] ?? ""}
                onChangeText={(value) =>
                  setNotes((prev) => ({ ...prev, [application._id]: value }))
                }
                placeholder="Internal review notes"
                placeholderTextColor="rgba(93,90,87,0.52)"
                multiline
                textAlignVertical="top"
              />

              <View style={styles.actions}>
                {ACTIONS.map((action) => {
                  const actionKey = `${application._id}:${action.value}`;
                  const isCurrent = application.status === action.value;
                  const isActing = acting === actionKey;
                  const color = STATUS_COLORS[action.value];
                  return (
                    <TouchableOpacity
                      key={action.value}
                      style={[
                        styles.actionButton,
                        {
                          borderColor: `${color}55`,
                          opacity:
                            isCurrent || (Boolean(acting) && !isActing)
                              ? 0.42
                              : 1,
                        },
                      ]}
                      disabled={isCurrent || Boolean(acting)}
                      onPress={() =>
                        handleReview(application._id, action.value)
                      }
                      activeOpacity={0.72}
                    >
                      <Text style={[styles.actionText, { color }]}>
                        {isActing ? "…" : action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingTop: Platform.OS === "ios" ? 60 : 36,
    paddingHorizontal: spacing.screenH,
    paddingBottom: 44,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.screenH,
  },
  centerButton: {
    alignSelf: "flex-start",
    marginTop: 24,
  },
  deniedTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    marginBottom: 8,
  },
  deniedBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.stone,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 16,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
  },
  wordmarkLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.stone,
    marginTop: 2,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 4,
  },
  headerActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerActionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  summaryCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.warmIvory,
    padding: 16,
    marginBottom: 16,
    ...shadow.subtle,
  },
  summaryLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 4,
  },
  summaryEmail: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  tabs: {
    gap: 8,
    paddingBottom: 16,
  },
  tab: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(245,239,230,0.44)",
  },
  tabActive: {
    borderColor: colors.mutedTeal,
    backgroundColor: "rgba(143,175,179,0.18)",
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.stone,
  },
  tabTextActive: {
    color: colors.ink,
  },
  loadingCard: {
    ...components.paperCard,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  emptyCard: {
    ...components.paperCard,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
  },
  applicationCard: {
    ...components.paperCard,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  applicantCopy: {
    flex: 1,
  },
  applicantName: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    marginBottom: 3,
  },
  applicantMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: "capitalize",
  },
  detail: {
    marginBottom: 12,
  },
  detailLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
  },
  notesInput: {
    minHeight: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    backgroundColor: "rgba(245,239,230,0.48)",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: "rgba(245,239,230,0.42)",
  },
  actionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});
