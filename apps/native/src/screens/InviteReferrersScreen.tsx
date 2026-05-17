import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Id } from "@packages/backend/convex/_generated/dataModel";
import { colors, fonts, radius, spacing, components } from "../theme";
import { useNativeAuth } from "../auth";

// resolve a display string for a referrer row (email takes precedence over phone)
function referrerContact(row: { email?: string; phone?: string }): string {
  return row.email ?? row.phone ?? "Unknown";
}

// badge background / border per referrer status
function referrerBadgeStyle(status: string) {
  if (status === "accepted") {
    return {
      backgroundColor: "rgba(214,181,109,0.2)",
      borderColor: "rgba(214,181,109,0.4)",
    };
  }
  if (status === "approved") {
    return {
      backgroundColor: "rgba(143,175,179,0.25)",
      borderColor: "rgba(143,175,179,0.4)",
    };
  }
  if (status === "removed") {
    return {
      backgroundColor: "rgba(93,90,87,0.1)",
      borderColor: "rgba(93,90,87,0.2)",
    };
  }
  // invited — fog blue
  return {
    backgroundColor: "rgba(220,230,234,0.72)",
    borderColor: "rgba(93,90,87,0.12)",
  };
}

function referrerBadgeTextColor(status: string): string {
  if (status === "accepted") return "#7A5C14";
  if (status === "approved") return colors.mutedTeal;
  if (status === "removed") return colors.stone;
  return colors.stone;
}

export default function InviteReferrersScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const referrers = useQuery(
    api.referrers.getMyReferrers,
    user?.email ? { email: user.email } : "skip",
  );
  const inviteReferrer = useMutation(api.referrers.inviteReferrer);
  const approveReferrer = useMutation(api.referrers.approveReferrer);
  const removeReferrer = useMutation(api.referrers.removeReferrer);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  // tracks which referrer row has an in-flight approve/remove action
  const [actionPending, setActionPending] = useState<string | null>(null);

  const canSend = email.trim().length > 0 && email.includes("@");

  const handleSendInvite = async () => {
    if (!canSend || sending) return;
    setSending(true);
    setError(null);
    setSuccessEmail(null);
    const trimmed = email.trim();
    try {
      await inviteReferrer({ email: trimmed, sessionEmail: user?.email });
      setEmail("");
      setSuccessEmail(trimmed);
    } catch {
      setError("Couldn't send invite. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async (referrerId: Id<"trustedReferrers">) => {
    setActionPending(referrerId);
    try {
      await approveReferrer({ referrerId, email: user?.email });
    } finally {
      setActionPending(null);
    }
  };

  const handleRemove = async (referrerId: Id<"trustedReferrers">) => {
    setActionPending(referrerId);
    try {
      await removeReferrer({ referrerId, email: user?.email });
    } finally {
      setActionPending(null);
    }
  };

  const referrerCount = referrers?.length ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
          >
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Choose your trusted circle.</Text>
          <Text style={styles.subtitle}>
            These are the people who know your taste and who you'd actually
            click with.
          </Text>

          <View style={components.divider} />
        </View>

        {/* invite by email */}
        <Text style={styles.sectionLabel}>Invite by email</Text>

        <TextInput
          style={styles.emailInput}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            // clear stale feedback when user starts typing again
            setSuccessEmail(null);
            setError(null);
          }}
          placeholder="friend@example.com"
          placeholderTextColor={colors.stone + "70"}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* inline success confirmation */}
        {successEmail ? (
          <View style={styles.successCard}>
            <Text style={styles.successText}>
              Invite sent to {successEmail}.
            </Text>
          </View>
        ) : null}

        {/* inline error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!canSend || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendInvite}
          disabled={!canSend || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={styles.sendButtonText}>Send invite</Text>
          )}
        </TouchableOpacity>

        {/* private share link — clipboard wiring is a TODO */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
          Or share a private link
        </Text>

        <View style={styles.shareLinkRow}>
          <Text style={styles.shareLinkText} numberOfLines={1}>
            sohoist.app/invite/••••••
          </Text>
          {/* TODO: wire up Clipboard.setStringAsync once expo-clipboard is installed */}
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.copyLabel}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* circle list */}
        <View style={styles.circleHeader}>
          <Text style={styles.sectionLabel}>Your circle</Text>
          <Text style={styles.circleCount}>
            {referrerCount} {referrerCount === 1 ? "person" : "people"}
          </Text>
        </View>

        {/* loading or genuinely empty */}
        {(!referrers || referrers.length === 0) && (
          <Text style={styles.emptyCircle}>No one invited yet.</Text>
        )}

        {/* referrer rows */}
        {referrers?.map((row: any) => {
          const isPending = actionPending === row._id;

          return (
            <View
              key={row._id}
              style={[components.paperCard, styles.referrerCard]}
            >
              {/* contact + status badge */}
              <View style={styles.referrerTopRow}>
                <Text style={styles.referrerContact}>
                  {referrerContact(row)}
                </Text>

                <View
                  style={[styles.referrerBadge, referrerBadgeStyle(row.status)]}
                >
                  <Text
                    style={[
                      styles.referrerBadgeText,
                      { color: referrerBadgeTextColor(row.status) },
                    ]}
                  >
                    {row.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* action buttons — approve + remove for "accepted", remove only for "approved" */}
              {(row.status === "accepted" || row.status === "approved") && (
                <View style={styles.referrerActions}>
                  {row.status === "accepted" && (
                    <TouchableOpacity
                      style={[
                        styles.referrerActionBtn,
                        styles.referrerActionBtnPrimary,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleApprove(row._id)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <ActivityIndicator color={colors.paper} size="small" />
                      ) : (
                        <Text style={styles.referrerActionBtnPrimaryText}>
                          Approve
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.referrerActionBtn,
                      styles.referrerActionBtnGhost,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleRemove(row._id)}
                    disabled={isPending}
                  >
                    {isPending && row.status === "approved" ? (
                      <ActivityIndicator color={colors.stone} size="small" />
                    ) : (
                      <Text style={styles.referrerActionBtnGhostText}>
                        Remove
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: 40,
  },

  // header
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    marginBottom: 8,
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
    fontSize: 26,
    letterSpacing: -0.4,
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    lineHeight: 20,
    marginBottom: 16,
  },

  // section labels
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 8,
  },
  sectionLabelSpaced: {
    marginTop: 28,
  },

  // email input
  emailInput: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 10,
  },

  // success / error feedback
  successCard: {
    backgroundColor: "rgba(143,175,179,0.18)",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  successText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedTeal,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#C0392B",
    marginBottom: 8,
  },

  // send invite button
  sendButton: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.paper,
  },

  // share link row — styled to look like an input field
  shareLinkRow: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  shareLinkText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.stone,
    flex: 1,
    marginRight: 12,
  },
  copyLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedTeal,
  },

  // circle section header (label + count on same row)
  circleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  circleCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },

  // empty state italic line
  emptyCircle: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.stone,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 16,
  },

  // referrer card
  referrerCard: {
    marginBottom: 10,
  },
  referrerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  referrerContact: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    marginRight: 10,
  },
  referrerBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  referrerBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.6,
  },

  // referrer approve/remove actions
  referrerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  referrerActionBtn: {
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  referrerActionBtnPrimary: {
    backgroundColor: colors.ink,
  },
  referrerActionBtnPrimaryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.paper,
  },
  referrerActionBtnGhost: {
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    backgroundColor: "transparent",
  },
  referrerActionBtnGhostText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
  },
});
