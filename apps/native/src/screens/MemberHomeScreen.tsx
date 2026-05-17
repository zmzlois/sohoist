import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { colors, components, fonts, radius, spacing, shadow } from "../theme";
import { useNativeAuth } from "../auth";

// ─── step indicator dot ───────────────────────────────────────────────────────

type StepDotState = "active" | "done" | "empty";

interface StepRowProps {
  label: string;
  state: StepDotState;
}

function StepRow({ label, state }: StepRowProps) {
  const dotColor =
    state === "active"
      ? colors.mutedTeal
      : state === "done"
        ? colors.ink
        : colors.borderGraphite;

  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.dot, { backgroundColor: dotColor }]} />
      <Text
        style={[stepStyles.label, state === "active" && stepStyles.labelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  labelActive: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
  },
});

// ─── quick action card ────────────────────────────────────────────────────────

interface QuickActionCardProps {
  count: string;
  label: string;
  onPress: () => void;
}

function QuickActionCard({ count, label, onPress }: QuickActionCardProps) {
  return (
    <TouchableOpacity
      style={quickStyles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={quickStyles.count}>{count}</Text>
      <Text style={quickStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const quickStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
    alignItems: "center",
    ...shadow.subtle,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 4,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
  },
});

// ─── main screen ──────────────────────────────────────────────────────────────

export default function MemberHomeScreen() {
  const router = useRouter();
  const { signOut, user } = useNativeAuth();

  const profile = useQuery(
    api.profile.getMyProfile,
    user?.email ? { email: user.email } : "skip",
  );
  const assets = useQuery(
    api.photos.getMyAssets,
    user?.email ? { email: user.email } : "skip",
  );
  const referrers = useQuery(
    api.referrers.getMyReferrers,
    user?.email ? { email: user.email } : "skip",
  );
  const rewardPool = useQuery(
    api.rewardPools.getMyRewardPool,
    user?.email ? { email: user.email } : "skip",
  );
  const introductions = useQuery(
    api.introductions.getMyIntroductions,
    user?.email ? { email: user.email } : "skip",
  );
  const referrerInvites = useQuery(
    api.referrers.getReferrerInvitesForMe,
    user?.email ? { email: user.email } : "skip",
  );

  // show a full-screen loader while core queries are still resolving
  if (profile === undefined || referrers === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

  const hasInterview = Boolean(profile?.voiceInterviewId);
  const hasSketch = Boolean(assets?.sketch);
  const hasReferrers = (referrers?.length ?? 0) > 0;
  const hasRewardPool = Boolean(rewardPool);
  const activeIntroCount = (introductions ?? []).filter(
    (i: any) => i.status !== "closed" && i.status !== "paid",
  ).length;
  const referrerPortalCount = referrerInvites?.length ?? 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>Sohoist</Text>
          <Text style={styles.wordmarkLabel}>PRIVATE INTRODUCTIONS</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/ghost-mode")}
          activeOpacity={0.7}
        >
          <View style={[components.badge, profile?.ghostMode ? styles.ghostBadgeOn : styles.ghostBadgeOff]}>
            <Text style={components.badgeText}>
              {profile?.ghostMode ? "GHOST MODE" : "PRIVACY"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── body ───────────────────────────────────────────────────────────── */}

      {/* state a: no voice interview yet */}
      {!hasInterview && (
        <>
          <View style={components.paperCard}>
            <View style={[components.badge, styles.cardBadge]}>
              <Text style={components.badgeText}>STEP 1 OF 4</Text>
            </View>

            <Text style={styles.cardHeadline}>Create your intro brief.</Text>
            <Text style={styles.cardBody}>
              A short voice conversation generates your private profile. Takes
              about 5 minutes.
            </Text>

            <View style={components.divider} />

            <TouchableOpacity
              style={components.primaryButton}
              onPress={() => router.push("/voice-profile")}
              activeOpacity={0.8}
            >
              <Text style={components.primaryButtonText}>
                Start voice profile →
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepsWrap}>
            <StepRow label="Create your intro brief" state="active" />
            <StepRow label="Add your photo" state="empty" />
            <StepRow label="Invite trusted referrers" state="empty" />
            <StepRow label="Set up your reward pool" state="empty" />
          </View>
        </>
      )}

      {/* state a2: has interview but no sketch yet */}
      {hasInterview && !hasSketch && (
        <>
          <View style={components.paperCard}>
            <View style={[components.badge, styles.cardBadge]}>
              <Text style={components.badgeText}>STEP 2 OF 4</Text>
            </View>

            <Text style={styles.cardHeadline}>Add your photo.</Text>
            <Text style={styles.cardBody}>
              We'll turn it into a private pencil sketch portrait. Referrers see the sketch — your photo stays private by default.
            </Text>

            <View style={components.divider} />

            <TouchableOpacity
              style={components.primaryButton}
              onPress={() => router.push("/photo-sketch")}
              activeOpacity={0.8}
            >
              <Text style={components.primaryButtonText}>
                Add photo →
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepsWrap}>
            <StepRow label="Create your intro brief" state="done" />
            <StepRow label="Add your photo" state="active" />
            <StepRow label="Invite trusted referrers" state="empty" />
            <StepRow label="Set up your reward pool" state="empty" />
          </View>
        </>
      )}

      {/* state b: has interview + sketch but no referrers */}
      {hasInterview && hasSketch && !hasReferrers && !hasRewardPool && (
        <>
          <View style={components.paperCard}>
            <View style={[components.badge, styles.cardBadge]}>
              <Text style={components.badgeText}>STEP 3 OF 4</Text>
            </View>

            <Text style={styles.cardHeadline}>Invite your trusted circle.</Text>
            <Text style={styles.cardBody}>
              These are the people who know your taste and who you'd actually
              click with.
            </Text>

            <View style={components.divider} />

            <TouchableOpacity
              style={components.primaryButton}
              onPress={() => router.push("/invite-referrers")}
              activeOpacity={0.8}
            >
              <Text style={components.primaryButtonText}>
                Invite referrers →
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepsWrap}>
            <StepRow label="Create your intro brief" state="done" />
            <StepRow label="Add your photo" state="done" />
            <StepRow label="Invite trusted referrers" state="active" />
            <StepRow label="Set up your reward pool" state="empty" />
          </View>
        </>
      )}

      {/* state b2: has interview + sketch + referrers but no reward pool yet */}
      {hasInterview && hasSketch && hasReferrers && !hasRewardPool && (
        <>
          <View style={components.paperCard}>
            <View style={[components.badge, styles.cardBadge]}>
              <Text style={components.badgeText}>STEP 4 OF 4</Text>
            </View>
            <Text style={styles.cardHeadline}>Set up your reward pool.</Text>
            <Text style={styles.cardBody}>
              A private thank-you for the friend who makes a meaningful
              introduction. Funds release only after a verified 6-month
              relationship.
            </Text>
            <View style={components.divider} />
            <TouchableOpacity
              style={components.primaryButton}
              onPress={() => router.push("/reward-pool")}
              activeOpacity={0.8}
            >
              <Text style={components.primaryButtonText}>
                Create reward pool →
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.stepsWrap}>
            <StepRow label="Create your intro brief" state="done" />
            <StepRow label="Add your photo" state="done" />
            <StepRow label="Invite trusted referrers" state="done" />
            <StepRow label="Set up your reward pool" state="active" />
          </View>
        </>
      )}

      {/* state c: fully set up — show the member dashboard */}
      {hasInterview && hasReferrers && hasRewardPool && (
        <>
          {/* mini brief card */}
          <View style={[components.paperCard, styles.briefCard]}>
            <View style={styles.briefCardHeader}>
              <Text style={styles.briefHeadline}>
                {profile?.headline ?? "Your intro brief"}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/intro-brief")}
                activeOpacity={0.7}
              >
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* tags — up to 3 */}
            {profile?.tags && profile.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {profile.tags.slice(0, 3).map((tag: string) => (
                  <View key={tag} style={[components.badge, styles.tag]}>
                    <Text style={components.badgeText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.visibilityLine}>
              {profile?.ghostMode
                ? "Ghost mode — hidden"
                : "Visible to referrers only"}
            </Text>
          </View>

          {/* quick actions row */}
          <View style={styles.quickRow}>
            <QuickActionCard
              count={String(referrers?.length ?? 0)}
              label="Referrers"
              onPress={() => router.push("/invite-referrers")}
            />
            <QuickActionCard
              count={String(activeIntroCount)}
              label="Active Intros"
              onPress={() => router.push("/intro-room")}
            />
          </View>

          {referrerPortalCount > 0 ? (
            <TouchableOpacity
              style={[components.secondaryButton, styles.referrerPortalButton]}
              onPress={() => router.push("/referrer-portal" as any)}
              activeOpacity={0.75}
            >
              <Text style={components.secondaryButtonText}>
                Referrer portal ({referrerPortalCount}) →
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* brief section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>YOUR INTRO BRIEF</Text>
            <TouchableOpacity
              onPress={() => router.push("/intro-brief")}
              activeOpacity={0.7}
            >
              <Text style={styles.editLink}>Edit profile</Text>
            </TouchableOpacity>
          </View>

          <View style={components.paperCard}>
            {profile?.bio ? (
              <Text style={styles.bioText}>{profile.bio}</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>
                Your intro brief will appear here after your voice profile is
                reviewed.
              </Text>
            )}
          </View>
        </>
      )}

      {/* ── footer sign-out ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.signOutWrap}
        onPress={() => signOut()}
        activeOpacity={0.6}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
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
  scroll: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: 60,
  },

  /* header */
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    marginBottom: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  wordmarkLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.stone,
    marginTop: 2,
  },

  /* card internals */
  cardBadge: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  cardHeadline: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 4,
  },
  whatIsThisBtn: {
    marginTop: 10,
  },

  /* steps indicator */
  stepsWrap: {
    marginTop: 20,
    paddingHorizontal: 4,
  },

  /* mini brief card */
  briefCard: {
    marginBottom: 14,
  },
  briefCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  briefHeadline: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
    flex: 1,
    marginRight: 12,
  },
  editLink: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedTeal,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    alignSelf: "flex-start",
  },
  visibilityLine: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
  },

  /* quick actions */
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  referrerPortalButton: {
    marginBottom: 24,
  },

  /* brief section */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
  },
  bioText: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 24,
  },
  bioPlaceholder: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.stone,
    lineHeight: 24,
    opacity: 0.65,
  },

  /* ghost mode badge variants */
  ghostBadgeOn: {
    backgroundColor: "rgba(43, 42, 40, 0.08)",
    borderColor: "rgba(43, 42, 40, 0.2)",
  },
  ghostBadgeOff: {
    backgroundColor: "rgba(220, 230, 234, 0.72)",
    borderColor: "rgba(143, 175, 179, 0.3)",
  },

  /* sign out */
  signOutWrap: {
    marginTop: 32,
    alignItems: "center",
  },
  signOutText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    opacity: 0.55,
  },
});
