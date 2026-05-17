import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Id } from "@packages/backend/convex/_generated/dataModel";
import { colors, fonts, radius, spacing, components } from "../theme";
import { useNativeAuth } from "../auth";

// filter options for the referral inbox tabs
type FilterOption = "All" | "New" | "Accepted" | "Declined";
const FILTERS: FilterOption[] = ["All", "New", "Accepted", "Declined"];

// map a referral status to the active filter bucket
function matchesFilter(status: string, filter: FilterOption): boolean {
  if (filter === "All") return true;
  if (filter === "New") return status === "submitted" || status === "viewed";
  if (filter === "Accepted") return status === "accepted";
  if (filter === "Declined") return status === "declined";
  return false;
}

// resolve a confidence level to its display label
function confidenceLabel(level: "low" | "medium" | "high"): string {
  if (level === "high") return "HIGH CONFIDENCE";
  if (level === "medium") return "MEDIUM";
  return "LOW";
}

// badge background color per referral status
function statusBadgeStyle(status: string) {
  if (status === "accepted") {
    return {
      backgroundColor: "rgba(143,175,179,0.3)",
      borderColor: "rgba(143,175,179,0.5)",
    };
  }
  if (status === "declined") {
    return {
      backgroundColor: "rgba(93,90,87,0.1)",
      borderColor: "rgba(93,90,87,0.2)",
    };
  }
  // submitted / viewed — fog blue
  return {
    backgroundColor: "rgba(220,230,234,0.72)",
    borderColor: "rgba(93,90,87,0.12)",
  };
}

function statusBadgeTextColor(status: string): string {
  if (status === "declined") return colors.stone;
  return colors.ink;
}

function statusBadgeLabel(status: string): string {
  if (status === "submitted") return "NEW";
  if (status === "viewed") return "VIEWED";
  if (status === "accepted") return "ACCEPTED";
  if (status === "declined") return "DECLINED";
  return status.toUpperCase();
}

export default function ReferralInboxScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const referrals = useQuery(
    api.referrals.getMyReferrals,
    user?.email ? { email: user.email } : "skip",
  );
  const respondToReferral = useMutation(api.referrals.respondToReferral);

  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
  // tracks which referral is awaiting a response (by _id)
  const [responding, setResponding] = useState<string | null>(null);

  const handleRespond = async (
    referralId: Id<"referrals">,
    action: "accepted" | "declined",
  ) => {
    setResponding(referralId);
    try {
      await respondToReferral({ referralId, action, email: user?.email });
    } finally {
      setResponding(null);
    }
  };

  const filteredReferrals =
    referrals?.filter((r: any) => matchesFilter(r.status, activeFilter)) ?? [];

  return (
    <View style={styles.root}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Referral Inbox</Text>
        <Text style={styles.subtitle}>
          Introductions from people who know you best.
        </Text>

        <View style={components.divider} />

        {/* filter pills — horizontal scroll, no indicator */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* loading */}
      {referrals === undefined && (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.stone} />
        </View>
      )}

      {/* list */}
      {referrals !== undefined && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* empty state */}
          {filteredReferrals.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyHeadline}>No introductions yet.</Text>
              <Text style={styles.emptyBody}>
                When a trusted friend refers someone, they'll appear here.
              </Text>
            </View>
          )}

          {/* referral cards */}
          {filteredReferrals.map((referral: any) => {
            const isActionable =
              referral.status === "submitted" || referral.status === "viewed";
            const isResponding = responding === referral._id;

            return (
              <View
                key={referral._id}
                style={[components.paperCard, styles.card]}
              >
                {/* top row: candidate info + status badge */}
                <View style={styles.cardTopRow}>
                  <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>
                      {referral.candidateName}
                    </Text>
                    {referral.candidateCity ? (
                      <Text style={styles.candidateCity}>
                        {referral.candidateCity}
                      </Text>
                    ) : null}
                  </View>

                  {/* status badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      statusBadgeStyle(referral.status),
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: statusBadgeTextColor(referral.status) },
                      ]}
                    >
                      {statusBadgeLabel(referral.status)}
                    </Text>
                  </View>
                </View>

                {/* why a fit */}
                <Text style={styles.whyFit}>{referral.whyAFit}</Text>

                {/* referred by row */}
                <Text style={styles.referredBy}>
                  {/* name resolution requires a db join — leaving as TODO */}
                  via a trusted friend
                </Text>

                {/* confidence badge, if present */}
                {referral.confidenceLevel ? (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceBadgeText}>
                      {confidenceLabel(referral.confidenceLevel)}
                    </Text>
                  </View>
                ) : null}

                {/* action buttons — only for pending referrals */}
                {isActionable && (
                  <View style={styles.actionRow}>
                    {/* pass */}
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonGhost]}
                      activeOpacity={0.7}
                      onPress={() => handleRespond(referral._id, "declined")}
                      disabled={isResponding}
                    >
                      {isResponding && responding === referral._id && (
                        <ActivityIndicator color={colors.stone} size="small" />
                      )}
                      {!(isResponding && responding === referral._id) && (
                        <Text style={styles.actionButtonGhostText}>Pass</Text>
                      )}
                    </TouchableOpacity>

                    {/* accept */}
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonPrimary]}
                      activeOpacity={0.8}
                      onPress={() => handleRespond(referral._id, "accepted")}
                      disabled={isResponding}
                    >
                      {isResponding && responding === referral._id ? (
                        <ActivityIndicator color={colors.paper} size="small" />
                      ) : (
                        <Text style={styles.actionButtonPrimaryText}>
                          Accept intro →
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },

  // header block (not scrollable)
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    paddingHorizontal: spacing.screenH,
    paddingBottom: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backChevron: {
    fontFamily: fonts.body,
    fontSize: 22,
    color: colors.stone,
    lineHeight: 24,
    marginRight: 2,
  },
  backLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.4,
    color: colors.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    marginBottom: 16,
  },

  // filter pill row
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
  },
  filterPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "transparent",
  },
  filterPillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.stone,
  },
  filterPillTextActive: {
    color: colors.paper,
  },

  // centered loading / empty
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // scrollable list
  listContent: {
    padding: spacing.screenH,
    paddingTop: 0,
    paddingBottom: 60,
  },

  // empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyHeadline: {
    fontFamily: fonts.displayItalic,
    fontSize: 20,
    color: colors.stone,
    textAlign: "center",
    marginBottom: 10,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    opacity: 0.7,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },

  // card
  card: {
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  candidateInfo: {
    flex: 1,
    marginRight: 10,
  },
  candidateName: {
    fontFamily: fonts.displayMedium,
    fontSize: 20,
    color: colors.ink,
  },
  candidateCity: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    marginTop: 2,
  },

  // status badge
  statusBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.6,
  },

  // why a fit
  whyFit: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    marginBottom: 10,
  },

  // referred by
  referredBy: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    marginBottom: 8,
  },

  // confidence badge
  confidenceBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(220,230,234,0.5)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(93,90,87,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  confidenceBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.stone,
    textTransform: "uppercase",
  },

  // action buttons
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonGhost: {
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    backgroundColor: "transparent",
  },
  actionButtonGhostText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  actionButtonPrimary: {
    backgroundColor: colors.ink,
  },
  actionButtonPrimaryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.paper,
  },
});
