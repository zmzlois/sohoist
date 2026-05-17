import { useEffect, useState } from "react";
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
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNativeAuth } from "../auth";
import { colors, fonts, radius, spacing, shadow, components } from "../theme";

type Visibility = "hidden" | "referrers_only" | "trusted_circle" | "public_preview";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; note: string }[] = [
  {
    value: "hidden",
    label: "Hidden",
    note: "Not visible to anyone. Referrers cannot view your brief.",
  },
  {
    value: "referrers_only",
    label: "Approved referrers only",
    note: "Only the people you've approved as referrers can view your brief.",
  },
  {
    value: "trusted_circle",
    label: "Trusted circle",
    note: "Visible to your trusted circle and approved referrers.",
  },
  {
    value: "public_preview",
    label: "Public preview",
    note: "A limited version is visible to anyone with your link.",
  },
];

// ── toggle row component ───────────────────────────────────────────────────
function ToggleRow({
  label,
  note,
  value,
  onToggle,
}: {
  label: string;
  note?: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.toggleRow}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.toggleRowText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {note ? <Text style={styles.toggleNote}>{note}</Text> : null}
      </View>
      <View style={[styles.togglePill, value && styles.togglePillOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

// ── visibility option row ──────────────────────────────────────────────────
function VisibilityOption({
  option,
  selected,
  onSelect,
}: {
  option: (typeof VISIBILITY_OPTIONS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.visOption, selected && styles.visOptionSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={[styles.radio, selected && styles.radioSelected]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.visLabel, selected && styles.visLabelSelected]}>
          {option.label}
        </Text>
        <Text style={styles.visNote}>{option.note}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── main screen ───────────────────────────────────────────────────────────
export default function GhostModeScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const updateProfile = useMutation(api.profile.updateProfile);

  const profile = useQuery(
    api.profile.getMyProfile,
    user?.email ? {} : "skip",
  );

  // local state mirrors the profile — seeded once profile loads
  const [ghostMode, setGhostMode] = useState(true);
  const [visibility, setVisibility] = useState<Visibility>("referrers_only");
  const [hideRewardAmount, setHideRewardAmount] = useState(false);
  const [hideCity, setHideCity] = useState(false);
  const [hideProfession, setHideProfession] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile || seeded) return;
    setGhostMode(profile.ghostMode ?? true);
    setVisibility((profile.visibility as Visibility) ?? "referrers_only");
    setHideRewardAmount(profile.hideRewardAmount ?? false);
    setHideCity(profile.hideCity ?? false);
    setHideProfession(profile.hideProfession ?? false);
    setSeeded(true);
  }, [profile, seeded]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        ghostMode,
        visibility,
        hideRewardAmount,
        hideCity,
        hideProfession,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (profile === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

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
      </View>

      <Text style={styles.wordmark}>Ghost Mode</Text>
      <Text style={styles.wordmarkLabel}>PRIVACY CONTROLS</Text>

      <Text style={styles.subline}>
        You remain private until you choose to be introduced.
      </Text>

      {/* ghost mode master toggle */}
      <View style={styles.section}>
        <ToggleRow
          label="Ghost Mode"
          note="When on, your profile is hidden from search and only visible to approved referrers."
          value={ghostMode}
          onToggle={() => setGhostMode((v) => !v)}
        />
      </View>

      <View style={styles.divider} />

      {/* visibility tier */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Who can see your brief</Text>
        {VISIBILITY_OPTIONS.map((opt) => (
          <VisibilityOption
            key={opt.value}
            option={opt}
            selected={visibility === opt.value}
            onSelect={() => setVisibility(opt.value)}
          />
        ))}
      </View>

      <View style={styles.divider} />

      {/* hide fields */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Hide from your brief</Text>
        <ToggleRow
          label="Hide reward amount"
          note='Show "Reward funded" badge instead of the exact figure.'
          value={hideRewardAmount}
          onToggle={() => setHideRewardAmount((v) => !v)}
        />
        <ToggleRow
          label="Hide exact city"
          note="Show region only — not your specific city."
          value={hideCity}
          onToggle={() => setHideCity((v) => !v)}
        />
        <ToggleRow
          label="Hide profession"
          note="Profession is hidden from referrers and candidates."
          value={hideProfession}
          onToggle={() => setHideProfession((v) => !v)}
        />
      </View>

      <View style={styles.divider} />

      {/* save */}
      <TouchableOpacity
        style={[components.primaryButton, styles.saveBtn]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color={colors.paper} size="small" />
        ) : (
          <Text style={components.primaryButtonText}>
            {saved ? "Saved ✓" : "Save privacy settings →"}
          </Text>
        )}
      </TouchableOpacity>

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
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    marginBottom: 16,
  },
  backChevron: {
    fontFamily: fonts.body,
    fontSize: 28,
    color: colors.stone,
    lineHeight: 30,
    alignSelf: "flex-start",
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  wordmarkLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 12,
  },
  subline: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    color: colors.stone,
    lineHeight: 22,
    marginBottom: 28,
  },

  section: {
    paddingVertical: 4,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.14)",
    marginVertical: 20,
  },

  // toggle row
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.14)",
    padding: 14,
    gap: 12,
    ...shadow.subtle,
  },
  toggleRowText: { flex: 1 },
  toggleLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  toggleNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    lineHeight: 17,
  },
  togglePill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(93, 90, 87, 0.18)",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  togglePillOn: {
    backgroundColor: colors.mutedTeal,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.paper,
    ...shadow.subtle,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },

  // visibility options
  visOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.14)",
    padding: 14,
    gap: 12,
    ...shadow.subtle,
  },
  visOptionSelected: {
    borderColor: colors.mutedTeal,
    backgroundColor: "rgba(220, 230, 234, 0.4)",
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(93, 90, 87, 0.35)",
    marginTop: 1,
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: colors.mutedTeal,
    backgroundColor: colors.mutedTeal,
  },
  visLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  visLabelSelected: {
    fontFamily: fonts.bodyMedium,
  },
  visNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    lineHeight: 17,
  },

  saveBtn: {
    marginTop: 8,
  },
});
