import { useState } from "react";
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
import { useNativeAuth } from "../auth";
import { colors, fonts, radius, spacing, shadow, components } from "../theme";

export default function VoiceRevealScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const [showTranscript, setShowTranscript] = useState(false);

  const profile = useQuery(api.profile.getMyProfile, user?.email ? {} : "skip");
  const interview = useQuery(
    api.profile.getMyVoiceInterview,
    user?.email ? { email: user.email } : "skip",
  );

  const loading = profile === undefined || interview === undefined;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
        <Text style={styles.loaderText}>Creating your intro brief…</Text>
      </View>
    );
  }

  const hasBio = Boolean(profile?.bio);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* header */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>Sohoist</Text>
        <Text style={styles.wordmarkLabel}>PRIVATE INTRODUCTIONS</Text>
      </View>

      {/* intro */}
      <Text style={styles.headline}>Here's what{"\n"}we heard.</Text>
      <Text style={styles.subline}>
        Review your generated intro brief. You can edit any of this.
      </Text>

      {/* generated profile card */}
      <View style={styles.card}>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>GENERATED PROFILE</Text>
        </View>

        {hasBio ? (
          <>
            {profile?.bio ? (
              <ProfileField label="About you" value={profile.bio} />
            ) : null}
            {profile?.openTo ? (
              <ProfileField label="Looking for" value={profile.openTo} />
            ) : null}
            {profile?.friendsShouldReferSomeoneWho ? (
              <ProfileField
                label="Friends should refer someone who…"
                value={profile.friendsShouldReferSomeoneWho}
              />
            ) : null}
            {profile?.doNotReferIf ? (
              <ProfileField
                label="Don't refer if…"
                value={profile.doNotReferIf}
              />
            ) : null}
            {profile?.tags?.length ? (
              <View style={styles.tagsWrap}>
                {profile.tags.map((tag: string) => (
                  <View key={tag} style={components.badge}>
                    <Text style={components.badgeText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyNote}>
            Your answers were saved. Tap "Edit your profile" to review and fill
            in the details.
          </Text>
        )}
      </View>

      {/* transcript toggle */}
      {interview?.transcript ? (
        <View style={styles.transcriptSection}>
          <TouchableOpacity
            style={styles.transcriptToggle}
            onPress={() => setShowTranscript((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.transcriptToggleText}>
              {showTranscript ? "Hide transcript ↑" : "See full transcript ↓"}
            </Text>
          </TouchableOpacity>

          {showTranscript && (
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptText}>{interview.transcript}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* CTAs */}
      <View style={styles.ctaGroup}>
        <TouchableOpacity
          style={components.primaryButton}
          onPress={() => router.replace("/home")}
          activeOpacity={0.85}
        >
          <Text style={components.primaryButtonText}>
            This sounds like me →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[components.secondaryButton, styles.editBtn]}
          onPress={() => router.push("/intro-brief")}
          activeOpacity={0.7}
        >
          <Text style={components.secondaryButtonText}>Edit your profile</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loaderText: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.stone,
    textAlign: "center",
  },
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    marginBottom: 28,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 24,
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
  headline: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 42,
    marginBottom: 10,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(120, 100, 75, 0.14)",
    padding: spacing.cardPad,
    marginBottom: 20,
    ...shadow.paper,
  },
  cardBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(220, 230, 234, 0.72)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  cardBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.stone,
  },
  field: {
    marginBottom: 16,
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
    lineHeight: 21,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  emptyNote: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    color: colors.stone,
    lineHeight: 22,
  },

  // transcript
  transcriptSection: {
    marginBottom: 24,
  },
  transcriptToggle: {
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  transcriptToggleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.stone,
    letterSpacing: 0.3,
  },
  transcriptCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.14)",
    padding: 16,
    marginTop: 8,
  },
  transcriptText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    lineHeight: 20,
  },

  // CTAs
  ctaGroup: {
    gap: 10,
  },
  editBtn: {
    // no extra styles needed
  },
});
