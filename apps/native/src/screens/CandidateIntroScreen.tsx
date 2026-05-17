import { useState } from "react";
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
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { colors, components, fonts, radius, shadow, spacing } from "../theme";

interface Props {
  token: string;
}

export default function CandidateIntroScreen({ token }: Props) {
  const intro = useQuery(
    api.introductions.getCandidateIntroByToken,
    token ? { token } : "skip",
  );
  const respond = useMutation(api.introductions.respondToCandidateIntro);
  const [acting, setActing] = useState<"accepted" | "declined" | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  async function handleRespond(action: "accepted" | "declined") {
    if (acting || !token) return;
    setActing(action);
    try {
      await respond({ token, action });
      setDone(action);
    } finally {
      setActing(null);
    }
  }

  if (intro === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

  if (!intro) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>This introduction is no longer active.</Text>
        <Text style={styles.emptyBody}>
          The link may have expired, or the member may have closed the introduction.
        </Text>
      </View>
    );
  }

  const alreadyResponded =
    done ?? (intro.status === "candidate_accepted" ? "accepted" : null) ??
    (intro.status === "candidate_declined" ? "declined" : null);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.wordmark}>Sohoist</Text>
        <Text style={styles.wordmarkLabel}>PRIVATE INTRODUCTION</Text>
      </View>

      <Text style={styles.headline}>
        {intro.referrerName} thought you and {intro.memberName} might enjoy meeting.
      </Text>
      <Text style={styles.subline}>
        No pressure. Start with context, then decide whether this feels interesting.
      </Text>

      {intro.sketchUrl ? (
        <View style={styles.sketchWrap}>
          <Image source={{ uri: intro.sketchUrl }} style={styles.sketch} />
          <View style={styles.sketchLabel}>
            <Text style={styles.sketchLabelText}>PENCIL PORTRAIT</Text>
          </View>
        </View>
      ) : null}

      <View style={components.paperCard}>
        <Text style={styles.memberName}>{intro.memberName}</Text>
        {intro.city || intro.profession ? (
          <Text style={styles.memberMeta}>
            {[intro.city, intro.profession].filter(Boolean).join(" · ")}
          </Text>
        ) : null}

        {intro.memberHeadline ? (
          <Text style={styles.memberHeadline}>{intro.memberHeadline}</Text>
        ) : null}
        {intro.memberBio ? (
          <Text style={styles.bodyText}>{intro.memberBio}</Text>
        ) : null}

        {intro.openTo ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Open to meeting</Text>
            <Text style={styles.fieldValue}>{intro.openTo}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Why your friend thinks this could work</Text>
        <Text style={styles.fieldValue}>{intro.whyAFit}</Text>

        {intro.howReferrerKnowsThem ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Context</Text>
            <Text style={styles.fieldValue}>{intro.howReferrerKnowsThem}</Text>
          </View>
        ) : null}

        {intro.tags?.length ? (
          <View style={styles.tags}>
            {intro.tags.map((tag: string) => (
              <View key={tag} style={components.badge}>
                <Text style={components.badgeText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {alreadyResponded ? (
        <View style={styles.responseCard}>
          <Text style={styles.responseTitle}>
            {alreadyResponded === "accepted" ? "Introduction accepted." : "Introduction declined."}
          </Text>
          <Text style={styles.responseBody}>
            {alreadyResponded === "accepted"
              ? "The member will see that you accepted and can follow up with context."
              : "Thanks for responding. Nothing else is needed."}
          </Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={components.primaryButton}
            onPress={() => handleRespond("accepted")}
            disabled={!!acting}
            activeOpacity={0.85}
          >
            {acting === "accepted" ? (
              <ActivityIndicator color={colors.paper} size="small" />
            ) : (
              <Text style={components.primaryButtonText}>Accept introduction →</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[components.secondaryButton, styles.secondaryAction]}
            onPress={() => handleRespond("declined")}
            disabled={!!acting}
            activeOpacity={0.75}
          >
            {acting === "declined" ? (
              <ActivityIndicator color={colors.ink} size="small" />
            ) : (
              <Text style={components.secondaryButtonText}>Pass for now</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.privacy}>
        Private by default. This page only opens from the introduction link.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.screenH,
    backgroundColor: colors.paper,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    textAlign: "center",
    lineHeight: 21,
  },
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    paddingBottom: 48,
  },
  header: { marginBottom: 28 },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  wordmarkLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.stone,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    color: colors.ink,
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.stone,
    marginBottom: 22,
  },
  sketchWrap: {
    borderRadius: radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 18,
    backgroundColor: colors.warmIvory,
    ...shadow.paper,
  },
  sketch: { width: "100%", aspectRatio: 1 },
  sketchLabel: {
    position: "absolute",
    left: 12,
    bottom: 12,
    borderRadius: radius.pill,
    backgroundColor: "rgba(245,239,230,0.88)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sketchLabelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.stone,
  },
  memberName: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  memberMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    marginTop: 2,
    marginBottom: 12,
  },
  memberHeadline: {
    fontFamily: fonts.displayItalic,
    fontSize: 21,
    color: colors.ink,
    lineHeight: 27,
    marginTop: 14,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
    marginTop: 14,
  },
  field: { marginTop: 18 },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 7,
  },
  fieldValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(93,90,87,0.13)",
    marginVertical: 18,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
  actions: { gap: 10, marginTop: 20 },
  secondaryAction: { marginTop: 0 },
  responseCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(143,175,179,0.32)",
    backgroundColor: "rgba(220,230,234,0.45)",
    padding: 18,
    marginTop: 18,
  },
  responseTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 6,
  },
  responseBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    lineHeight: 20,
  },
  privacy: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 22,
  },
});
