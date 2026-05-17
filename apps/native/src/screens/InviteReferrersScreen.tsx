import { useMemo, useState } from "react";
import {
  Alert,
  Share,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  NativeModules,
} from "react-native";
import type * as ExpoContacts from "expo-contacts";
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

type ImportedContact = {
  name: string;
  emails: string[];
  phones: string[];
};

function contactAccessLabel(status: string, alreadyOnSohoist: boolean) {
  if (status === "approved") return "Has access";
  if (status === "accepted") return "Needs approval";
  if (status === "invited") return "Invited";
  if (alreadyOnSohoist) return "On Sohoist";
  return "Invite";
}

function firstContactMethod(row: { email?: string | null; phone?: string | null }) {
  return row.email ?? row.phone ?? "";
}

export default function InviteReferrersScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const referrers = useQuery(
    api.referrers.getMyReferrers,
    user?.email ? { email: user.email } : "skip",
  );
  const [contacts, setContacts] = useState<ImportedContact[]>([]);
  const contactMatches = useQuery(
    api.referrers.matchContacts,
    user?.email && contacts.length > 0
      ? { email: user.email, contacts }
      : "skip",
  );
  const inviteReferrer = useMutation(api.referrers.inviteReferrer);
  const createShareLink = useMutation(api.referrers.createShareLink);
  const approveReferrer = useMutation(api.referrers.approveReferrer);
  const removeReferrer = useMutation(api.referrers.removeReferrer);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsEnabled, setContactsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  // tracks which referrer row has an in-flight approve/remove action
  const [actionPending, setActionPending] = useState<string | null>(null);

  const canSend = email.trim().length > 0 && email.includes("@");
  const visibleContactMatches = useMemo(
    () => (contactMatches ?? []).slice(0, 12),
    [contactMatches],
  );

  const handleLoadContacts = async () => {
    if (loadingContacts) return;
    setLoadingContacts(true);
    setError(null);
    try {
      if (!NativeModules.ExpoContacts) {
        setError(
          "Contacts need a fresh native build. Rebuild the iOS app, then try again.",
        );
        return;
      }

      let Contacts: typeof ExpoContacts;
      try {
        Contacts = await import("expo-contacts");
      } catch {
        setError(
          "Contacts need a fresh native build. Rebuild the iOS app, then try again.",
        );
        return;
      }
      if (
        typeof Contacts.isAvailableAsync !== "function" ||
        typeof Contacts.getContactsAsync !== "function"
      ) {
        setError(
          "Contacts need a fresh native build. Rebuild the iOS app, then try again.",
        );
        return;
      }

      const available = await Contacts.isAvailableAsync();
      if (!available) {
        setError("Contacts are not available on this device.");
        return;
      }

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Contacts access was not granted.");
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
        pageSize: 200,
      });
      const normalizedContacts = data
        .map((contact) => ({
          name: contact.name ?? "Unnamed contact",
          emails:
            contact.emails
              ?.map((entry) => entry.email?.trim().toLowerCase())
              .filter((value): value is string => Boolean(value)) ?? [],
          phones:
            contact.phoneNumbers
              ?.map((entry) => entry.number?.trim())
              .filter((value): value is string => Boolean(value)) ?? [],
        }))
        .filter((contact) => contact.emails.length > 0 || contact.phones.length > 0);

      setContacts(normalizedContacts);
      setContactsEnabled(true);
    } finally {
      setLoadingContacts(false);
    }
  };

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

  const handleInviteContact = async (row: {
    name: string;
    email?: string | null;
    phone?: string | null;
    accessStatus: string;
  }) => {
    if (row.accessStatus !== "not_invited") return;
    setActionPending(firstContactMethod(row) || row.name);
    setError(null);
    try {
      await inviteReferrer({
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        sessionEmail: user?.email,
      });
    } catch {
      Alert.alert("Invite failed", "Please try again in a moment.");
    } finally {
      setActionPending(null);
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

  const handleShareLink = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const token = await createShareLink({ email: user?.email });
      const link = `sohoist://invite/${token}`;
      await Share.share({
        message: `I'm using Sohoist for private introductions. If someone comes to mind who you think I'd genuinely click with, I'd love your referral.\n\n${link}`,
        url: link,
      });
    } catch {
      // user cancelled share sheet — not an error
    } finally {
      setSharing(false);
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

        {/* contact discovery */}
        <View style={styles.contactsCard}>
          <View style={styles.contactsHeader}>
            <View>
              <Text style={styles.shareCardHeadline}>Find trusted people.</Text>
              <Text style={styles.shareCardBody}>
                Sohoist checks your contacts locally, then shows who already has
                a profile or access to your intro brief.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[components.secondaryButton, loadingContacts && styles.disabledBtn]}
            onPress={handleLoadContacts}
            disabled={loadingContacts}
            activeOpacity={0.78}
          >
            {loadingContacts ? (
              <ActivityIndicator color={colors.ink} size="small" />
            ) : (
              <Text style={components.secondaryButtonText}>
                {contactsEnabled ? "Refresh contacts" : "Connect contacts"}
              </Text>
            )}
          </TouchableOpacity>

          {contactsEnabled ? (
            <View style={styles.contactSummary}>
              <Text style={styles.contactSummaryText}>
                {contacts.length} contacts available
              </Text>
              {contactMatches === undefined ? (
                <ActivityIndicator color={colors.mutedTeal} size="small" />
              ) : null}
            </View>
          ) : null}

          {visibleContactMatches.map((row: any) => {
            const method = firstContactMethod(row);
            const canInvite = row.accessStatus === "not_invited";
            const pending = actionPending === (method || row.name);

            return (
              <View key={`${row.name}-${method}`} style={styles.contactRow}>
                <View style={styles.contactCopy}>
                  <Text style={styles.contactName}>{row.sohoistName ?? row.name}</Text>
                  <Text style={styles.contactMeta} numberOfLines={1}>
                    {method || "No contact method"}{" "}
                    {row.alreadyOnSohoist ? "· profile found" : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.contactAction,
                    canInvite && styles.contactActionInvite,
                  ]}
                  onPress={() => handleInviteContact(row)}
                  disabled={!canInvite || pending}
                  activeOpacity={0.72}
                >
                  {pending ? (
                    <ActivityIndicator
                      color={canInvite ? colors.paper : colors.stone}
                      size="small"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.contactActionText,
                        canInvite && styles.contactActionTextInvite,
                      ]}
                    >
                      {contactAccessLabel(row.accessStatus, row.alreadyOnSohoist)}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* share link — primary method */}
        <View style={styles.shareCard}>
          <Text style={styles.shareCardHeadline}>Share your intro brief.</Text>
          <Text style={styles.shareCardBody}>
            Send a private link to anyone you trust. They'll see your intro brief and can choose to join as a referrer.
          </Text>
          <TouchableOpacity
            style={[components.primaryButton, sharing && styles.disabledBtn]}
            onPress={handleShareLink}
            disabled={sharing}
            activeOpacity={0.85}
          >
            {sharing ? (
              <ActivityIndicator color={colors.paper} size="small" />
            ) : (
              <Text style={components.primaryButtonText}>
                Share my intro brief →
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or invite by email</Text>
          <View style={styles.orLine} />
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

  // contact discovery
  contactsCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.24)",
    padding: spacing.cardPad,
    marginBottom: 20,
    gap: 12,
  },
  contactsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  contactSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(93, 90, 87, 0.12)",
    paddingTop: 12,
  },
  contactSummaryText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(93, 90, 87, 0.1)",
    paddingTop: 12,
  },
  contactCopy: {
    flex: 1,
  },
  contactName: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 2,
  },
  contactMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
  },
  contactAction: {
    minWidth: 96,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "rgba(245, 239, 230, 0.55)",
  },
  contactActionInvite: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  contactActionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.stone,
  },
  contactActionTextInvite: {
    color: colors.paper,
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

  // share card
  shareCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(120, 100, 75, 0.14)",
    padding: spacing.cardPad,
    marginBottom: 20,
    gap: 10,
  },
  shareCardHeadline: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  shareCardBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
  },
  disabledBtn: { opacity: 0.5 },

  // or divider
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.14)",
  },
  orText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.stone,
    opacity: 0.6,
  },
});
