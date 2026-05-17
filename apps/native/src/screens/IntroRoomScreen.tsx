import {
  ActivityIndicator,
  Platform,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNativeAuth } from "../auth";
import { colors, fonts, radius, spacing, shadow, components } from "../theme";

const MILESTONES = [
  {
    status: "intro_active" as const,
    label: "Introduction active",
    cta: null,
  },
  {
    status: "first_date_logged" as const,
    label: "We met",
    cta: "We met! →",
  },
  {
    status: "relationship_confirmed" as const,
    label: "We're dating",
    cta: "We're dating →",
  },
];

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  candidate_invited: {
    label: "Waiting for candidate",
    color: colors.warmAmber,
  },
  candidate_accepted: { label: "Introduction active", color: colors.mutedTeal },
  intro_active: { label: "Introduction active", color: colors.mutedTeal },
  first_date_logged: { label: "You've met", color: colors.mutedTeal },
  relationship_confirmed: { label: "Dating ✓", color: "#4CAF83" },
  payout_pending: { label: "Payout pending", color: "#4CAF83" },
  paid: { label: "Reward paid", color: "#4CAF83" },
  closed: { label: "Closed", color: colors.stone },
};

const AUTH_BASE_URL =
  process.env.EXPO_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, "") ??
  "https://sohoist.com";

export default function IntroRoomScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const updateStatus = useMutation(api.introductions.updateIntroductionStatus);

  const intros = useQuery(
    api.introductions.getMyIntroductions,
    user?.email ? { email: user.email } : "skip",
  );

  const singleIntro = useQuery(
    api.introductions.getIntroductionDetails,
    id && user?.email
      ? { introductionId: id as any, email: user.email }
      : "skip",
  );

  if (intros === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

  async function advance(
    introId: string,
    nextStatus: (typeof MILESTONES)[number]["status"] | "closed",
  ) {
    await updateStatus({
      introductionId: introId as any,
      status: nextStatus,
      email: user?.email,
    });
  }

  async function shareCandidateIntro(intro: any) {
    const webLink = `${AUTH_BASE_URL}/intro/${intro.inviteToken}`;
    const appLink = `sohoist://intro/${intro.inviteToken}`;
    await Share.share({
      message: `A private Sohoist introduction is waiting for you.\n\n${webLink}\n\nIf you have the app installed: ${appLink}`,
      url: webLink,
    });
  }

  // single-intro view (when navigated with ?id=)
  const displayIntros = id && singleIntro ? [singleIntro] : (intros ?? []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
        >
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.wordmark}>Sohoist</Text>
          <Text style={styles.wordmarkLabel}>
            {id ? "INTRO ROOM" : "INTRODUCTIONS"}
          </Text>
        </View>
        <View style={{ width: 20 }} />
      </View>

      <Text style={styles.headline}>
        {id ? "Your introduction." : "Your introductions."}
      </Text>
      <Text style={styles.subline}>
        Track how each introduction is progressing.
      </Text>

      {displayIntros.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No introductions yet.</Text>
          <Text style={styles.emptyBody}>
            When you accept a referral from your inbox, the introduction appears
            here.
          </Text>
          <TouchableOpacity
            style={[components.secondaryButton, { marginTop: 20 }]}
            onPress={() => router.push("/referral-inbox")}
            activeOpacity={0.7}
          >
            <Text style={components.secondaryButtonText}>
              Check referral inbox
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {displayIntros.map((intro: any) => {
        const statusInfo =
          STATUS_DISPLAY[intro.status] ?? STATUS_DISPLAY["intro_active"]!;

        const currentMilestoneIdx = MILESTONES.findIndex(
          (m) =>
            m.status === intro.status ||
            (intro.status === "candidate_accepted" &&
              m.status === "intro_active"),
        );
        const nextMilestone = MILESTONES[currentMilestoneIdx + 1];
        const isClosed =
          intro.status === "relationship_confirmed" ||
          intro.status === "payout_pending" ||
          intro.status === "paid" ||
          intro.status === "closed";

        return (
          <View key={intro._id} style={styles.introCard}>
            {/* referrer + status */}
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.referrerLabel}>REFERRED BY</Text>
                <Text style={styles.referrerName}>
                  {(intro as any).referrerName}
                </Text>
              </View>
              <View
                style={[
                  components.badge,
                  {
                    borderColor: statusInfo.color + "44",
                    backgroundColor: statusInfo.color + "18",
                  },
                ]}
              >
                <Text
                  style={[components.badgeText, { color: statusInfo.color }]}
                >
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* candidate details */}
            <Text style={styles.fieldLabel}>Candidate</Text>
            <Text style={styles.fieldValue}>
              {(intro as any).referral?.candidateName ?? "—"}
            </Text>

            {(intro as any).referral?.candidateCity ? (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>City</Text>
                <Text style={styles.fieldValue}>
                  {(intro as any).referral.candidateCity}
                </Text>
              </>
            ) : null}

            {/* why a fit */}
            {(intro as any).referral?.whyAFit ? (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                  Why {(intro as any).referrerName} thinks you'd click
                </Text>
                <Text style={styles.fitText}>
                  "{(intro as any).referral.whyAFit}"
                </Text>
              </>
            ) : null}

            {/* how referrer knows them */}
            {(intro as any).referral?.howReferrerKnowsThem ? (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                  How they know the candidate
                </Text>
                <Text style={styles.fieldValue}>
                  {(intro as any).referral.howReferrerKnowsThem}
                </Text>
              </>
            ) : null}

            {/* milestone progress */}
            {intro.status === "candidate_invited" && intro.inviteToken ? (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={components.primaryButton}
                  onPress={() => shareCandidateIntro(intro)}
                  activeOpacity={0.8}
                >
                  <Text style={components.primaryButtonText}>
                    Share candidate invite →
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {/* milestone progress */}
            {!isClosed && nextMilestone?.cta && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={components.primaryButton}
                  onPress={() => advance(intro._id, nextMilestone.status)}
                  activeOpacity={0.8}
                >
                  <Text style={components.primaryButtonText}>
                    {nextMilestone.cta}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {isClosed && (
              <>
                <View style={styles.divider} />
                <Text style={styles.closedNote}>
                  {intro.status === "relationship_confirmed" ||
                  intro.status === "payout_pending"
                    ? "Your reward is being tracked. Stay in the relationship for 6 months for it to release."
                    : "This introduction is complete."}
                </Text>
              </>
            )}

            {/* close option */}
            {!isClosed && (
              <TouchableOpacity
                style={styles.closeIntroBtn}
                onPress={() => advance(intro._id, "closed")}
                activeOpacity={0.6}
              >
                <Text style={styles.closeIntroText}>Not pursuing this →</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.screenH, paddingBottom: 40 },
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backChevron: {
    fontFamily: fonts.body,
    fontSize: 28,
    color: colors.stone,
    lineHeight: 30,
  },
  headerCenter: { alignItems: "center" },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  wordmarkLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.stone,
    marginTop: 2,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 24,
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 280,
  },

  introCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(120,100,75,0.14)",
    padding: 20,
    marginBottom: 16,
    ...shadow.paper,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  referrerLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 4,
  },
  referrerName: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(93,90,87,0.12)",
    marginVertical: 16,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  fitText: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    opacity: 0.85,
  },
  closedNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    lineHeight: 19,
    textAlign: "center",
  },
  closeIntroBtn: {
    alignItems: "center",
    paddingTop: 12,
  },
  closeIntroText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    opacity: 0.55,
  },
});
