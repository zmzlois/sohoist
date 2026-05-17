import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { colors, fonts, radius, spacing, shadow } from "../theme";
import { useNativeAuth } from "../auth";

const STATUS_COPY: Record<string, { label: string; note: string }> = {
  submitted: {
    label: "Under Review",
    note: "Your application has been received. Our team reviews every application personally.",
  },
  under_review: {
    label: "Under Review",
    note: "We're reviewing your application now. We'll be in touch shortly.",
  },
  waitlisted: {
    label: "Waitlisted",
    note: "You're on the waitlist. We'll invite you as space opens in your city.",
  },
};

export default function ApplicationPendingScreen() {
  const { signOut, user } = useNativeAuth();
  const application = useQuery(
    api.applications.getMyApplication,
    user?.email ? { email: user.email } : "skip",
  );

  const status = application?.status ?? "submitted";
  const copy = STATUS_COPY[status] ?? STATUS_COPY.submitted;

  return (
    <View style={styles.container}>
      {/* wordmark */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>Sohoist</Text>
        <Text style={styles.wordmarkLabel}>PRIVATE INTRODUCTIONS</Text>
      </View>

      {/* status card */}
      <View style={styles.card}>
        {/* status badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{copy.label}</Text>
        </View>

        <Text style={styles.headline}>Your application is with us.</Text>

        <Text style={styles.body}>{copy.note}</Text>

        <View style={styles.divider} />

        <Text style={styles.detail}>
          We review every application personally. Most decisions are made within
          a few days. You'll receive an email once you've been approved.
        </Text>
      </View>

      {/* what to expect */}
      <View style={styles.steps}>
        {[
          { n: "1", text: "Application received" },
          { n: "2", text: "Concierge review" },
          { n: "3", text: "Approval or waitlist notification" },
          { n: "4", text: "Voice profile creation" },
        ].map((step, i) => (
          <View key={step.n} style={styles.step}>
            <View style={[styles.stepDot, i === 0 && styles.stepDotActive]} />
            <Text style={[styles.stepText, i === 0 && styles.stepTextActive]}>
              {step.text}
            </Text>
          </View>
        ))}
      </View>

      {/* sign out */}
      <TouchableOpacity
        style={styles.signOutButton}
        activeOpacity={0.7}
        onPress={() => signOut()}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.screenH,
    paddingBottom: 36,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    marginBottom: 32,
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
  card: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.14)",
    padding: spacing.cardPad,
    marginBottom: 24,
    ...shadow.paper,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(220, 230, 234, 0.72)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 10,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.14)",
    marginBottom: 16,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    lineHeight: 19,
    opacity: 0.75,
  },
  steps: {
    gap: 14,
    marginBottom: 32,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(93, 90, 87, 0.25)",
  },
  stepDotActive: {
    backgroundColor: colors.mutedTeal,
  },
  stepText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    opacity: 0.6,
  },
  stepTextActive: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    opacity: 1,
  },
  signOutButton: {
    marginTop: "auto",
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    opacity: 0.6,
  },
});
