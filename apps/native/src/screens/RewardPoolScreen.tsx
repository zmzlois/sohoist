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
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNativeAuth } from "../auth";
import { colors, fonts, radius, spacing, shadow, components } from "../theme";

const AMOUNTS = [
  { label: "$100", value: 100 },
  { label: "$250", value: 250 },
  { label: "$500", value: 500 },
  { label: "$1,000", value: 1000 },
];

const STATUS_LABELS: Record<string, string> = {
  not_created: "Not created",
  active: "Active",
  partially_funded: "Partially funded",
  fully_funded: "Fully funded",
  intro_accepted: "Intro accepted",
  relationship_pending: "Relationship pending",
  eligible_for_payout: "Eligible for payout",
  paid: "Paid",
  refunded: "Refunded",
  disputed: "Disputed",
  expired: "Expired",
};

// ── envelope illustration ──────────────────────────────────────────────────
function Envelope() {
  return (
    <View style={env.wrap}>
      {/* envelope body */}
      <View style={env.body}>
        {/* top-left flap line */}
        <View style={[env.flapLine, env.flapLeft]} />
        {/* top-right flap line */}
        <View style={[env.flapLine, env.flapRight]} />
        {/* horizontal seal strip at bottom third */}
        <View style={env.sealStrip} />
      </View>
      {/* wax seal dot */}
      <View style={env.seal}>
        <Text style={env.sealLetter}>S</Text>
      </View>
    </View>
  );
}

const env = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  body: {
    width: 140,
    height: 96,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.35)",
    borderRadius: 4,
    backgroundColor: colors.warmIvory,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  flapLine: {
    position: "absolute",
    top: 0,
    width: 71,
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.25)",
    transformOrigin: "top",
  },
  flapLeft: {
    left: 0,
    transform: [{ rotate: "35deg" }],
    top: 0,
  },
  flapRight: {
    right: 0,
    transform: [{ rotate: "-35deg" }],
    top: 0,
  },
  sealStrip: {
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.18)",
    marginHorizontal: 16,
    marginBottom: 28,
  },
  seal: {
    position: "absolute",
    bottom: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warmAmber,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.subtle,
  },
  sealLetter: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.paper,
    letterSpacing: -0.3,
  },
});

// ── main screen ────────────────────────────────────────────────────────────
export default function RewardPoolScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const createRewardPool = useMutation(api.rewardPools.createRewardPool);

  const pool = useQuery(
    api.rewardPools.getMyRewardPool,
    user?.email ? { email: user.email } : "skip",
  );

  const [amount, setAmount] = useState(250);
  const [saving, setSaving] = useState<"full" | "minimum" | null>(null);

  if (pool === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

  async function handleCreate(tier: "full" | "minimum") {
    if (saving) return;
    setSaving(tier);
    try {
      await createRewardPool({
        amount,
        depositTier: tier,
        termsAccepted: true,
        email: user?.email,
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* back */}
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
        hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
      >
        <Text style={styles.backChevron}>‹</Text>
      </TouchableOpacity>

      {/* ── existing pool view ──────────────────────────────────────────── */}
      {pool ? (
        <>
          <Envelope />

          <Text style={styles.headline}>Your private reward.</Text>
          <Text style={styles.subline}>
            Saved locally for now. Releases after a verified six-month relationship once payments are connected.
          </Text>

          <View style={styles.poolCard}>
            <View style={styles.poolRow}>
              <Text style={styles.poolFieldLabel}>Amount</Text>
              <Text style={styles.poolAmount}>
                {pool.hideAmount ? "Private" : `$${Math.round(pool.amount / 100)}`}
              </Text>
            </View>
            <View style={styles.poolDivider} />
            <View style={styles.poolRow}>
              <Text style={styles.poolFieldLabel}>Status</Text>
              <View style={[
                components.badge,
                pool.status === "active" && styles.activeBadge,
              ]}>
                <Text style={[
                  components.badgeText,
                  pool.status === "active" && { color: colors.mutedTeal },
                ]}>
                  {STATUS_LABELS[pool.status] ?? pool.status}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.trustNote}>
            Payment is local-only for now. No card is charged and no money moves from this screen.
          </Text>

          <TouchableOpacity
            style={[components.secondaryButton, { marginTop: 20 }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={components.secondaryButtonText}>Back to home</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* ── create form ──────────────────────────────────────────────── */}
          <Envelope />

          <Text style={styles.headline}>Set your private reward.</Text>
          <Text style={styles.subline}>
            This saves the reward signal locally. Payment collection stays off until checkout is connected.
          </Text>

          {/* amount cards */}
          <View style={styles.amountGrid}>
            {AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a.value}
                style={[
                  styles.amountCard,
                  amount === a.value && styles.amountCardSelected,
                ]}
                onPress={() => setAmount(a.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.amountValue,
                  amount === a.value && styles.amountValueSelected,
                ]}>
                  {a.label}
                </Text>
                {amount === a.value && (
                  <View style={styles.amountDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* trust CTAs */}
          <TouchableOpacity
            style={[components.primaryButton, styles.trustCta]}
            onPress={() => handleCreate("full")}
            disabled={!!saving}
            activeOpacity={0.85}
          >
            {saving === "full" ? (
              <ActivityIndicator color={colors.paper} size="small" />
            ) : (
              <Text style={components.primaryButtonText}>
                I trust you →
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[components.secondaryButton, styles.testCta]}
            onPress={() => handleCreate("minimum")}
            disabled={!!saving}
            activeOpacity={0.75}
          >
            {saving === "minimum" ? (
              <ActivityIndicator color={colors.ink} size="small" />
            ) : (
              <Text style={components.secondaryButtonText}>
                Test a small amount first →
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.termsLink}>
            Local-only reward terms accepted when you continue.
          </Text>
        </>
      )}

      <View style={{ height: 60 }} />
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
    paddingTop: Platform.OS === "ios" ? 64 : 40,
  },
  back: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  backChevron: {
    fontFamily: fonts.body,
    fontSize: 28,
    color: colors.stone,
    lineHeight: 30,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 32,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
    marginTop: -20,
  },

  // amount grid — 2×2
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  amountCard: {
    width: "48%",
    height: 64,
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.subtle,
  },
  amountCardSelected: {
    borderColor: colors.warmAmber,
    backgroundColor: "rgba(214, 181, 109, 0.12)",
  },
  amountValue: {
    fontFamily: fonts.mono,
    fontSize: 20,
    color: colors.ink,
  },
  amountValueSelected: {
    color: colors.ink,
  },
  amountDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.warmAmber,
    position: "absolute",
    bottom: 10,
  },

  trustCta: {
    marginBottom: 10,
  },
  testCta: {
    marginBottom: 16,
  },
  termsLink: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.stone,
    opacity: 0.55,
    textAlign: "center",
  },

  // existing pool
  poolCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(120, 100, 75, 0.14)",
    padding: 20,
    ...shadow.paper,
    marginBottom: 16,
  },
  poolRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  poolDivider: {
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.12)",
  },
  poolFieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
  },
  poolAmount: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  activeBadge: {
    backgroundColor: "rgba(143, 175, 179, 0.25)",
    borderColor: "rgba(143, 175, 179, 0.4)",
  },
  trustNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    lineHeight: 18,
    textAlign: "center",
    opacity: 0.7,
  },
});
