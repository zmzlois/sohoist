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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNativeAuth } from "../auth";
import { colors, components, fonts, radius, spacing, shadow } from "../theme";

const REWARD_AMOUNTS = [100, 250, 500, 1000, 2000];

function rewardTierForAmount(amount: number) {
  if (amount >= 1000) return "full" as const;
  if (amount >= 500) return "half" as const;
  return "minimum" as const;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, user } = useNativeAuth();
  const saveRewardPool = useMutation(api.rewardPools.createRewardPool);
  const rewardPool = useQuery(
    api.rewardPools.getMyRewardPool,
    user?.email ? { email: user.email } : "skip",
  );
  const [amount, setAmount] = useState(250);
  const [hideAmount, setHideAmount] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rewardPool) return;
    setAmount(Math.round(rewardPool.amount / 100));
    setHideAmount(rewardPool.hideAmount);
  }, [rewardPool]);

  async function handleSaveReward() {
    if (!user?.email || saving) return;
    setSaving(true);
    try {
      await saveRewardPool({
        amount,
        depositTier: rewardTierForAmount(amount),
        hideAmount,
        termsAccepted: true,
        email: user.email,
      });
    } finally {
      setSaving(false);
    }
  }

  if (rewardPool === undefined) {
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          activeOpacity={0.72}
        >
          <Ionicons name="chevron-back" size={20} color={colors.stone} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.wordmark}>Settings</Text>
          <Text style={styles.wordmarkLabel}>PRIVATE INTRODUCTIONS</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.replace("/home")}
          activeOpacity={0.72}
        >
          <Ionicons name="home-outline" size={18} color={colors.stone} />
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/home")}
          activeOpacity={0.72}
        >
          <Ionicons name="home-outline" size={16} color={colors.stone} />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/intro-brief")}
          activeOpacity={0.72}
        >
          <Ionicons name="person-outline" size={16} color={colors.stone} />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
        <View style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="settings-outline" size={16} color={colors.ink} />
          <Text style={[styles.navText, styles.navTextActive]}>Settings</Text>
        </View>
      </View>

      <View style={components.paperCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionLabel}>REWARD POOL</Text>
            <Text style={styles.cardTitle}>Adjust your private reward.</Text>
          </View>
          <View style={[components.badge, styles.statusBadge]}>
            <Text style={components.badgeText}>
              {rewardPool ? rewardPool.status : "not set"}
            </Text>
          </View>
        </View>

        <Text style={styles.cardBody}>
          This is the private signal your trusted referrers see. Payment remains
          local-only until checkout is connected.
        </Text>

        <View style={styles.amountGrid}>
          {REWARD_AMOUNTS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.amountChip,
                amount === option && styles.amountChipActive,
              ]}
              onPress={() => setAmount(option)}
              activeOpacity={0.72}
            >
              <Text
                style={[
                  styles.amountText,
                  amount === option && styles.amountTextActive,
                ]}
              >
                ${option.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setHideAmount((value) => !value)}
          activeOpacity={0.72}
        >
          <View>
            <Text style={styles.toggleTitle}>Hide exact amount</Text>
            <Text style={styles.toggleSubcopy}>
              Referrers will see “Reward funded” instead.
            </Text>
          </View>
          <View style={[styles.toggle, hideAmount && styles.toggleOn]}>
            <View style={[styles.toggleKnob, hideAmount && styles.toggleKnobOn]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[components.primaryButton, styles.saveButton]}
          onPress={handleSaveReward}
          disabled={saving}
          activeOpacity={0.84}
        >
          {saving ? (
            <ActivityIndicator color={colors.paper} size="small" />
          ) : (
            <Text style={components.primaryButtonText}>Save reward pool</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutWrap}
        onPress={() => signOut()}
        activeOpacity={0.62}
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
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    paddingBottom: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerText: {
    alignItems: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.warmIvory,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  wordmarkLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.stone,
  },
  navRow: {
    flexDirection: "row",
    backgroundColor: "rgba(239, 231, 220, 0.72)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 4,
    marginBottom: 16,
  },
  navItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  navItemActive: {
    backgroundColor: colors.warmIvory,
    ...shadow.subtle,
  },
  navText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.stone,
  },
  navTextActive: {
    color: colors.ink,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  statusBadge: {
    alignSelf: "flex-start",
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.stone,
    marginBottom: 18,
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  amountChip: {
    minWidth: "31%",
    flexGrow: 1,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 239, 230, 0.6)",
  },
  amountChipActive: {
    borderColor: "rgba(214, 181, 109, 0.55)",
    backgroundColor: "rgba(214, 181, 109, 0.16)",
  },
  amountText: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.stone,
  },
  amountTextActive: {
    color: colors.ink,
  },
  toggleRow: {
    minHeight: 68,
    borderTopWidth: 1,
    borderTopColor: "rgba(93, 90, 87, 0.14)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93, 90, 87, 0.14)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  toggleTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 3,
  },
  toggleSubcopy: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    backgroundColor: "rgba(93, 90, 87, 0.14)",
  },
  toggleOn: {
    backgroundColor: "rgba(143, 175, 179, 0.45)",
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.warmIvory,
    ...shadow.subtle,
  },
  toggleKnobOn: {
    transform: [{ translateX: 20 }],
  },
  saveButton: {
    marginTop: 2,
  },
  signOutWrap: {
    marginTop: 36,
    alignItems: "center",
    paddingVertical: 14,
  },
  signOutText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    opacity: 0.58,
  },
});
