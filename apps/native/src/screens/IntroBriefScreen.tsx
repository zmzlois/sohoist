import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNativeAuth } from "../auth";
import { colors, fonts, radius, spacing, shadow, components } from "../theme";

type EditingKey =
  | "bio"
  | "openTo"
  | "friendsShouldReferSomeoneWho"
  | "doNotReferIf"
  | null;

const FIELD_LABELS: Record<string, string> = {
  bio: "About you",
  openTo: "What you're looking for",
  friendsShouldReferSomeoneWho: "Friends should refer someone who…",
  doNotReferIf: "Don't refer if…",
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  bio: "A short description of who you are…",
  openTo: "What you're looking for in a partner or relationship…",
  friendsShouldReferSomeoneWho:
    "What a referring friend should look for in a match…",
  doNotReferIf: "Dealbreakers — things that won't work…",
};

export default function IntroBriefScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const updateProfile = useMutation(api.profile.updateProfile);

  const profile = useQuery(
    api.profile.getMyProfile,
    user?.email ? { email: user.email } : "skip",
  );

  const [editing, setEditing] = useState<EditingKey>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  if (profile === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

  const fieldKeys: EditingKey[] = [
    "bio",
    "openTo",
    "friendsShouldReferSomeoneWho",
    "doNotReferIf",
  ];

  function startEdit(key: EditingKey) {
    setDraft((profile as any)?.[key as string] ?? "");
    setEditing(key);
  }

  async function saveEdit() {
    if (!editing || saving) return;
    setSaving(true);
    try {
      await updateProfile({ [editing]: draft, email: user?.email });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  const tags: string[] = profile?.tags ?? [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
            <Text style={styles.wordmarkLabel}>INTRO BRIEF</Text>
          </View>
          <View style={{ width: 20 }} />
        </View>

        <Text style={styles.headline}>Your intro brief.</Text>
        <Text style={styles.subline}>
          This is what trusted friends see when considering an intro. Keep it
          honest and you.
        </Text>

        {/* tags */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <View key={tag} style={components.badge}>
                <Text style={components.badgeText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* editable fields */}
        {fieldKeys.map((key) => {
          const value = (profile as any)?.[key as string] as string | undefined;
          const isEditing = editing === key;

          return (
            <View key={key} style={styles.fieldWrap}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>{FIELD_LABELS[key!]}</Text>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={() => startEdit(key)}
                    hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                  >
                    <Text style={styles.editLink}>
                      {value ? "Edit" : "Add"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={draft}
                    onChangeText={setDraft}
                    multiline
                    autoFocus
                    placeholder={FIELD_PLACEHOLDERS[key!]}
                    placeholderTextColor={colors.stone + "80"}
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                    autoCorrect
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setEditing(null)}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[components.primaryButton, styles.saveBtn]}
                      onPress={saveEdit}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color={colors.paper} size="small" />
                      ) : (
                        <Text style={components.primaryButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.fieldCard}
                  onPress={() => startEdit(key)}
                  activeOpacity={0.7}
                >
                  {value ? (
                    <Text style={styles.fieldValue}>{value}</Text>
                  ) : (
                    <Text style={styles.fieldPlaceholder}>
                      {FIELD_PLACEHOLDERS[key!]}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* visibility toggle */}
        <View style={styles.visibilityWrap}>
          <Text style={styles.visibilityLabel}>
            {profile?.visibility === "hidden" || profile?.ghostMode
              ? "Ghost mode — hidden from referrers"
              : "Visible to your trusted referrers"}
          </Text>
          <TouchableOpacity
            onPress={() =>
              updateProfile({
                ghostMode: !profile?.ghostMode,
                visibility: profile?.ghostMode ? "referrers_only" : "hidden",
                email: user?.email,
              })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.visibilityToggle}>
              {profile?.ghostMode ? "Go visible" : "Go to ghost mode"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />

        {/* cta */}
        <TouchableOpacity
          style={components.primaryButton}
          onPress={() => router.push("/reward-pool")}
          activeOpacity={0.8}
        >
          <Text style={components.primaryButtonText}>
            Set up reward pool →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[components.secondaryButton, { marginTop: 10 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={components.secondaryButtonText}>Back to home</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: 40,
  },
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
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 20,
  },
  fieldWrap: { marginBottom: 20 },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
  },
  editLink: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedTeal,
  },
  fieldCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93,90,87,0.18)",
    padding: 14,
    ...shadow.subtle,
  },
  fieldValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 21,
  },
  fieldPlaceholder: {
    fontFamily: fonts.displayItalic,
    fontSize: 14,
    color: colors.stone,
    opacity: 0.55,
    lineHeight: 21,
  },
  input: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(143,175,179,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    ...shadow.subtle,
  },
  textarea: { minHeight: 100, paddingTop: 12 },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(43,42,40,0.18)",
  },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  saveBtn: { flex: 1, height: 44 },
  visibilityWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(93,90,87,0.12)",
    marginTop: 4,
  },
  visibilityLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    flex: 1,
  },
  visibilityToggle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedTeal,
    marginLeft: 12,
  },
});
