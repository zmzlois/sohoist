import { useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useNativeAuth } from "../auth";
import { colors, components, fonts, radius, shadow, spacing } from "../theme";

type Confidence = "low" | "medium" | "high";

const CONFIDENCE_OPTIONS: Confidence[] = ["low", "medium", "high"];

export default function ReferrerPortalScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const { user } = useNativeAuth();
  const invites = useQuery(
    api.referrers.getReferrerInvitesForMe,
    user?.email ? { email: user.email } : "skip",
  );
  const made = useQuery(
    api.referrals.getReferralsMadeByMe,
    user?.email ? { email: user.email } : "skip",
  );
  const submitReferral = useMutation(api.referrals.submitReferral);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    memberId ?? null,
  );
  const [candidateName, setCandidateName] = useState("");
  const [candidateContact, setCandidateContact] = useState("");
  const [candidateCity, setCandidateCity] = useState("");
  const [whyAFit, setWhyAFit] = useState("");
  const [howKnown, setHowKnown] = useState("");
  const [confidence, setConfidence] = useState<Confidence>("medium");
  const [candidateKnows, setCandidateKnows] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedMemberId || !invites?.length) return;
    setSelectedMemberId(String(invites[0]._id ? invites[0].memberId : ""));
  }, [invites, selectedMemberId]);

  const selected = useMemo(
    () => invites?.find((row: any) => String(row.memberId) === selectedMemberId),
    [invites, selectedMemberId],
  );

  const canSubmit =
    selected?.status === "approved" &&
    candidateName.trim() &&
    candidateContact.trim() &&
    whyAFit.trim().length >= 20 &&
    howKnown.trim().length >= 8;

  async function handleSubmit() {
    if (!selected || !canSubmit || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await submitReferral({
        memberId: selected.memberId as Id<"users">,
        candidateName: candidateName.trim(),
        candidateContact: candidateContact.trim(),
        candidateCity: candidateCity.trim() || undefined,
        whyAFit: whyAFit.trim(),
        howReferrerKnowsThem: howKnown.trim(),
        confidenceLevel: confidence,
        candidateKnowsAboutIntro: candidateKnows,
        email: user?.email,
      });
      setCandidateName("");
      setCandidateContact("");
      setCandidateCity("");
      setWhyAFit("");
      setHowKnown("");
      setConfidence("medium");
      setCandidateKnows(false);
      setMessage("Referral submitted. The member will review it privately.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      setMessage(
        reason.includes("approved")
          ? "The member still needs to approve you before you can submit referrals."
          : "Couldn't submit this referral. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (invites === undefined || made === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.wordmark}>Sohoist</Text>
        <Text style={styles.wordmarkLabel}>REFERRER PORTAL</Text>
        <Text style={styles.headline}>Make a thoughtful introduction.</Text>
        <Text style={styles.subline}>
          Tell us why this person fits in real life, not just on paper.
        </Text>

        {invites.length === 0 ? (
          <View style={components.paperCard}>
            <Text style={styles.emptyTitle}>No circles yet.</Text>
            <Text style={styles.emptyBody}>
              Accept a member's private invite link first. Once approved, you can submit referrals here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Member circle</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.memberTabs}
            >
              {invites.map((row: any) => {
                const active = String(row.memberId) === selectedMemberId;
                return (
                  <TouchableOpacity
                    key={row._id}
                    style={[styles.memberTab, active && styles.memberTabActive]}
                    onPress={() => setSelectedMemberId(String(row.memberId))}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.memberTabName,
                        active && styles.memberTabNameActive,
                      ]}
                    >
                      {row.memberName}
                    </Text>
                    <Text style={styles.memberTabStatus}>{row.status}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selected ? (
              <View style={[components.paperCard, styles.memberCard]}>
                <View style={styles.memberTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{selected.memberName}</Text>
                    {selected.city ? (
                      <Text style={styles.memberMeta}>{selected.city}</Text>
                    ) : null}
                  </View>
                  {selected.rewardLabel ? (
                    <View style={components.badge}>
                      <Text style={components.badgeText}>
                        {selected.rewardLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {selected.memberBio ? (
                  <Text style={styles.memberBio}>{selected.memberBio}</Text>
                ) : null}
                {selected.openTo ? (
                  <Text style={styles.memberLooking}>{selected.openTo}</Text>
                ) : null}
              </View>
            ) : null}

            {selected?.status !== "approved" ? (
              <View style={styles.waitingCard}>
                <Text style={styles.waitingTitle}>Waiting for approval.</Text>
                <Text style={styles.waitingBody}>
                  You're in the circle. The member needs to approve you before referrals can be submitted.
                </Text>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.sectionLabel}>Candidate</Text>
                <TextInput
                  style={styles.input}
                  value={candidateName}
                  onChangeText={setCandidateName}
                  placeholder="Candidate name"
                  placeholderTextColor={colors.stone + "80"}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  value={candidateContact}
                  onChangeText={setCandidateContact}
                  placeholder="Email or phone"
                  placeholderTextColor={colors.stone + "80"}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  value={candidateCity}
                  onChangeText={setCandidateCity}
                  placeholder="City, optional"
                  placeholderTextColor={colors.stone + "80"}
                />
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={whyAFit}
                  onChangeText={setWhyAFit}
                  placeholder="Why do you think they would click?"
                  placeholderTextColor={colors.stone + "80"}
                  multiline
                />
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={howKnown}
                  onChangeText={setHowKnown}
                  placeholder="How do you know this person?"
                  placeholderTextColor={colors.stone + "80"}
                  multiline
                />

                <Text style={styles.sectionLabel}>Confidence</Text>
                <View style={styles.confidenceRow}>
                  {CONFIDENCE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.confidencePill,
                        confidence === option && styles.confidencePillActive,
                      ]}
                      onPress={() => setConfidence(option)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.confidenceText,
                          confidence === option && styles.confidenceTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setCandidateKnows((value) => !value)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.checkbox, candidateKnows && styles.checkboxOn]}>
                    {candidateKnows ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkText}>
                    Candidate already knows I may introduce them.
                  </Text>
                </TouchableOpacity>

                {message ? <Text style={styles.message}>{message}</Text> : null}

                <TouchableOpacity
                  style={[
                    components.primaryButton,
                    (!canSubmit || submitting) && styles.disabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.paper} size="small" />
                  ) : (
                    <Text style={components.primaryButtonText}>
                      Submit referral →
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {made.length > 0 ? (
          <View style={styles.madeWrap}>
            <Text style={styles.sectionLabel}>Your referrals</Text>
            {made.map((referral: any) => (
              <View key={referral._id} style={styles.madeRow}>
                <View>
                  <Text style={styles.madeName}>{referral.candidateName}</Text>
                  <Text style={styles.madeNote}>{referral.whyAFit}</Text>
                </View>
                <Text style={styles.madeStatus}>{referral.status}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingTop: Platform.OS === "ios" ? 60 : 36,
    paddingBottom: 48,
  },
  back: { alignSelf: "flex-start", marginBottom: 18 },
  backText: { fontFamily: fonts.body, fontSize: 14, color: colors.stone },
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
    marginBottom: 24,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    color: colors.ink,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.stone,
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 25,
    color: colors.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.stone,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 10,
  },
  memberTabs: { gap: 10, paddingBottom: 16 },
  memberTab: {
    minWidth: 150,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    backgroundColor: "rgba(239,231,220,0.45)",
    padding: 14,
  },
  memberTabActive: {
    borderColor: colors.mutedTeal,
    backgroundColor: "rgba(220,230,234,0.65)",
  },
  memberTabName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 5,
  },
  memberTabNameActive: { color: colors.ink },
  memberTabStatus: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.stone,
  },
  memberCard: { marginBottom: 18 },
  memberTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  memberName: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  memberMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    marginTop: 2,
  },
  memberBio: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 22,
    marginTop: 14,
  },
  memberLooking: {
    fontFamily: fonts.displayItalic,
    fontSize: 20,
    color: colors.ink,
    lineHeight: 26,
    marginTop: 12,
  },
  waitingCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(214,181,109,0.35)",
    backgroundColor: "rgba(214,181,109,0.12)",
    padding: 18,
  },
  waitingTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 6,
  },
  waitingBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.stone,
  },
  form: { gap: 12 },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    backgroundColor: colors.warmIvory,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  textarea: {
    minHeight: 94,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  confidenceRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  confidencePill: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    paddingVertical: 10,
    alignItems: "center",
  },
  confidencePillActive: {
    borderColor: colors.mutedTeal,
    backgroundColor: "rgba(143,175,179,0.2)",
  },
  confidenceText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.stone,
    textTransform: "capitalize",
  },
  confidenceTextActive: { color: colors.ink },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  checkmark: { color: colors.paper, fontFamily: fonts.bodyMedium, fontSize: 14 },
  checkText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    lineHeight: 19,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    lineHeight: 19,
  },
  disabled: { opacity: 0.45 },
  madeWrap: { marginTop: 30, gap: 10 },
  madeRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.warmIvory,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    ...shadow.subtle,
  },
  madeName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  madeNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    lineHeight: 18,
    maxWidth: 220,
  },
  madeStatus: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.mutedTeal,
  },
});
