import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNativeAuth } from "../auth";
import { colors, fonts, radius, spacing, shadow, components } from "../theme";

interface Props {
  token: string;
}

export default function ShareableProfileScreen({ token }: Props) {
  const router = useRouter();
  const { isSignedIn, user } = useNativeAuth();
  const acceptReferrerInvite = useMutation(api.referrers.acceptReferrerInvite);

  const sharedProfile = useQuery(api.sharing.getProfileByToken, { token });

  if (sharedProfile === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

  if (!sharedProfile) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundHeadline}>This link is no longer active.</Text>
        <Text style={styles.notFoundBody}>
          The member may have revoked access or the link has expired.
        </Text>
      </View>
    );
  }

  async function handleAccept() {
    try {
      await acceptReferrerInvite({ token, email: user?.email });
      router.replace("/home");
    } catch {
      // if already accepted or other error, still navigate home
      router.replace("/home");
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* wordmark */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>Sohoist</Text>
        <Text style={styles.wordmarkLabel}>PRIVATE INTRODUCTIONS</Text>
      </View>

      {/* intro copy */}
      <Text style={styles.headline}>
        {sharedProfile.memberName} is inviting you{"\n"}to their circle.
      </Text>
      <Text style={styles.subline}>
        They're looking for trusted people who can make thoughtful introductions.
      </Text>

      {/* sketch portrait */}
      {sharedProfile.sketchUrl ? (
        <View style={styles.sketchWrap}>
          <Image
            source={{ uri: sharedProfile.sketchUrl }}
            style={styles.sketch}
            resizeMode="cover"
          />
          <View style={styles.sketchLabel}>
            <Text style={styles.sketchLabelText}>PENCIL PORTRAIT</Text>
          </View>
        </View>
      ) : (
        <View style={styles.sketchPlaceholder}>
          <Text style={styles.sketchPlaceholderText}>
            Portrait not yet added
          </Text>
        </View>
      )}

      {/* brief card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.memberName}>{sharedProfile.memberName}</Text>
          {sharedProfile.city ? (
            <Text style={styles.memberCity}>{sharedProfile.city}</Text>
          ) : null}
        </View>

        {sharedProfile.bio ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>About</Text>
            <Text style={styles.fieldValue}>{sharedProfile.bio}</Text>
          </View>
        ) : null}

        {sharedProfile.openTo ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Looking for</Text>
            <Text style={styles.fieldValue}>{sharedProfile.openTo}</Text>
          </View>
        ) : null}

        {sharedProfile.friendsShouldReferSomeoneWho ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Refer someone who…</Text>
            <Text style={styles.fieldValue}>
              {sharedProfile.friendsShouldReferSomeoneWho}
            </Text>
          </View>
        ) : null}

        {sharedProfile.doNotReferIf ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Don't refer if…</Text>
            <Text style={styles.fieldValue}>{sharedProfile.doNotReferIf}</Text>
          </View>
        ) : null}

        {sharedProfile.tags && sharedProfile.tags.length > 0 ? (
          <View style={styles.tagsWrap}>
            {sharedProfile.tags.map((tag: string) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* CTAs */}
      {isSignedIn ? (
        <View style={styles.ctaGroup}>
          <TouchableOpacity
            style={components.primaryButton}
            onPress={handleAccept}
            activeOpacity={0.85}
          >
            <Text style={components.primaryButtonText}>
              Accept as referrer →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[components.secondaryButton, styles.declineBtn]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={components.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.ctaGroup}>
          <TouchableOpacity
            style={components.primaryButton}
            onPress={() => router.push("/sign-in")}
            activeOpacity={0.85}
          >
            <Text style={components.primaryButtonText}>
              Sign in to accept →
            </Text>
          </TouchableOpacity>
          <Text style={styles.signInNote}>
            You'll need a Sohoist account to accept this introduction.
          </Text>
        </View>
      )}

      {/* privacy note */}
      <View style={styles.privacyNote}>
        <Text style={styles.privacyText}>
          Private by default. This profile is only visible because you received this link.
        </Text>
      </View>

      <View style={{ height: 48 }} />
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
  notFound: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screenH,
    gap: 12,
  },
  notFoundHeadline: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  notFoundBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    textAlign: "center",
  },
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    marginBottom: 24,
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
  headline: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 38,
    marginBottom: 8,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 24,
  },

  // sketch
  sketchWrap: {
    marginBottom: 20,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadow.paper,
  },
  sketch: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.card,
  },
  sketchLabel: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(245, 239, 230, 0.88)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sketchLabelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.stone,
  },
  sketchPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.card,
    backgroundColor: colors.warmIvory,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.14)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  sketchPlaceholderText: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    color: colors.stone,
    opacity: 0.5,
  },

  // brief card
  card: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(120, 100, 75, 0.14)",
    padding: spacing.cardPad,
    marginBottom: 20,
    ...shadow.paper,
  },
  cardHeader: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  memberName: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  memberCity: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  field: {
    marginBottom: 14,
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
  tag: {
    backgroundColor: "rgba(220, 230, 234, 0.72)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.ink,
  },

  // CTAs
  ctaGroup: {
    gap: 10,
    marginBottom: 20,
  },
  declineBtn: {},
  signInNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.7,
  },

  // privacy
  privacyNote: {
    backgroundColor: "rgba(220, 230, 234, 0.35)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.2)",
    padding: 12,
  },
  privacyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    lineHeight: 18,
    textAlign: "center",
    opacity: 0.8,
  },
});
