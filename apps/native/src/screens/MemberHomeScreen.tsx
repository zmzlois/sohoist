import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { colors, components, fonts, radius, spacing, shadow } from "../theme";
import { useNativeAuth } from "../auth";
import VoiceInputCard from "../components/VoiceInputCard";

const ADMIN_EMAIL =
  process.env.EXPO_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ??
  "lois@sf-voice.sh";
const VOICE_PROMPTS = [
  "What kind of relationship would feel steady and real right now?",
  "What do your closest friends understand about your taste?",
  "Who should your referrers absolutely not send your way?",
];
type VoiceSheetStatus = "idle" | "recording" | "processing" | "error";

function truncateIntro(value: string, maxLength = 126) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

function formatVoiceTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function routeForStep(index: number) {
  if (index === 1) return "voice";
  if (index === 2) return "/photo-sketch";
  if (index === 3) return "/invite-referrers";
  return "/reward-pool";
}

// ─── step indicator dot ───────────────────────────────────────────────────────

type StepDotState = "active" | "done" | "empty";

interface StepRowProps {
  index: number;
  label: string;
  state: StepDotState;
  onPress?: () => void;
}

function StepRow({ index, label, state, onPress }: StepRowProps) {
  const isTouchable = Boolean(onPress);

  return (
    <TouchableOpacity
      style={[
        stepStyles.row,
        state === "active" && stepStyles.rowActive,
        !isTouchable && stepStyles.rowDisabled,
      ]}
      onPress={onPress}
      disabled={!isTouchable}
      activeOpacity={0.72}
    >
      <View
        style={[
          stepStyles.indexBubble,
          state === "done" && stepStyles.indexBubbleDone,
          state === "active" && stepStyles.indexBubbleActive,
        ]}
      >
        <Text
          style={[
            stepStyles.indexText,
            state !== "empty" && stepStyles.indexTextActive,
          ]}
        >
          {index}
        </Text>
      </View>
      <Text
        style={[
          stepStyles.label,
          state === "active" && stepStyles.labelActive,
          state === "done" && stepStyles.labelDone,
        ]}
      >
        {label}
      </Text>
      {isTouchable ? (
        <Ionicons name="chevron-forward" size={14} color={colors.stone} />
      ) : null}
    </TouchableOpacity>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: "rgba(239, 231, 220, 0.46)",
  },
  rowActive: {
    backgroundColor: "rgba(220, 230, 234, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.34)",
  },
  rowDisabled: {
    opacity: 0.48,
  },
  indexBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: colors.paper,
  },
  indexBubbleDone: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  indexBubbleActive: {
    backgroundColor: colors.mutedTeal,
    borderColor: "rgba(143, 175, 179, 0.44)",
  },
  indexText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.stone,
  },
  indexTextActive: {
    color: colors.paper,
  },
  label: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
  },
  labelActive: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
  },
  labelDone: {
    color: colors.ink,
  },
});

// ─── quick action card ────────────────────────────────────────────────────────

interface QuickActionCardProps {
  count: string;
  label: string;
  onPress: () => void;
}

function QuickActionCard({ count, label, onPress }: QuickActionCardProps) {
  return (
    <TouchableOpacity
      style={quickStyles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={quickStyles.count}>{count}</Text>
      <Text style={quickStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const quickStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.warmIvory,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
    alignItems: "center",
    ...shadow.subtle,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 4,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
  },
});

// ─── trusted referrer row ────────────────────────────────────────────────────

interface TrustedReferrerRowProps {
  name: string;
  intro: string;
  status: string;
  hasVoiceNote: boolean;
  onPlay: () => void;
}

function TrustedReferrerRow({
  name,
  intro,
  status,
  hasVoiceNote,
  onPlay,
}: TrustedReferrerRowProps) {
  return (
    <View style={referrerStyles.row}>
      <TouchableOpacity
        style={[
          referrerStyles.playButton,
          !hasVoiceNote && referrerStyles.playButtonDisabled,
        ]}
        onPress={onPlay}
        activeOpacity={hasVoiceNote ? 0.75 : 1}
      >
        <Ionicons
          name="play"
          size={14}
          color={hasVoiceNote ? colors.ink : "rgba(93, 90, 87, 0.38)"}
        />
      </TouchableOpacity>
      <View style={referrerStyles.copy}>
        <View style={referrerStyles.titleRow}>
          <Text style={referrerStyles.name}>{name}</Text>
          <Text style={referrerStyles.status}>{status}</Text>
        </View>
        <Text style={referrerStyles.intro}>{truncateIntro(intro)}</Text>
      </View>
    </View>
  );
}

const referrerStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(93, 90, 87, 0.12)",
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(220, 230, 234, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  playButtonDisabled: {
    backgroundColor: "rgba(93, 90, 87, 0.05)",
    borderColor: "rgba(93, 90, 87, 0.12)",
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
  },
  status: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.mutedTeal,
    marginTop: 4,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.stone,
  },
});

// ─── home navigation ─────────────────────────────────────────────────────────

interface HomeNavProps {
  onProfile: () => void;
  onSettings: () => void;
}

function HomeNav({ onProfile, onSettings }: HomeNavProps) {
  return (
    <View style={navStyles.wrap}>
      <View style={[navStyles.item, navStyles.itemActive]}>
        <Ionicons name="home-outline" size={16} color={colors.ink} />
        <Text style={[navStyles.label, navStyles.labelActive]}>Home</Text>
      </View>
      <TouchableOpacity
        style={navStyles.item}
        onPress={onProfile}
        activeOpacity={0.72}
      >
        <Ionicons name="person-outline" size={16} color={colors.stone} />
        <Text style={navStyles.label}>Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={navStyles.item}
        onPress={onSettings}
        activeOpacity={0.72}
      >
        <Ionicons name="settings-outline" size={16} color={colors.stone} />
        <Text style={navStyles.label}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const navStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "rgba(239, 231, 220, 0.72)",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 4,
    marginBottom: 16,
  },
  item: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  itemActive: {
    backgroundColor: colors.warmIvory,
    ...shadow.subtle,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.stone,
  },
  labelActive: {
    color: colors.ink,
  },
});

interface ProgressStepsProps {
  states: [StepDotState, StepDotState, StepDotState, StepDotState];
  onStepPress: (index: number) => void;
}

function ProgressSteps({ states, onStepPress }: ProgressStepsProps) {
  const labels = [
    "Create your intro brief",
    "Add your photo",
    "Invite trusted referrers",
    "Reward pool (optional)",
  ];

  return (
    <View style={styles.stepsWrap}>
      {labels.map((label, index) => {
        const state = states[index];
        return (
          <StepRow
            key={label}
            index={index + 1}
            label={label}
            state={state}
            onPress={
              state === "empty" && index !== 3
                ? undefined
                : () => onStepPress(index + 1)
            }
          />
        );
      })}
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function MemberHomeScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const createShareLink = useMutation(api.referrers.createShareLink);
  const generateUploadUrl = useMutation(api.voice.generateUploadUrl);
  const transcribeAndSave = useAction(api.voice.transcribeAndSave);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [sharing, setSharing] = useState(false);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceSheetStatus>("idle");
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const isAdmin = user?.email.trim().toLowerCase() === ADMIN_EMAIL;

  const profile = useQuery(
    api.profile.getMyProfile,
    user?.email ? { email: user.email } : "skip",
  );
  const assets = useQuery(
    api.photos.getMyAssets,
    user?.email ? { email: user.email } : "skip",
  );
  const referrers = useQuery(
    api.referrers.getMyReferrers,
    user?.email ? { email: user.email } : "skip",
  );
  const rewardPool = useQuery(
    api.rewardPools.getMyRewardPool,
    user?.email ? { email: user.email } : "skip",
  );
  const introductions = useQuery(
    api.introductions.getMyIntroductions,
    user?.email ? { email: user.email } : "skip",
  );
  const referrerInvites = useQuery(
    api.referrers.getReferrerInvitesForMe,
    user?.email ? { email: user.email } : "skip",
  );
  const isVoiceRecording = voiceStatus === "recording";
  const isVoiceProcessing = voiceStatus === "processing";

  useEffect(() => {
    if (!isVoiceRecording) return;
    const timer = setInterval(
      () => setVoiceElapsed((seconds) => seconds + 1),
      1000,
    );
    return () => clearInterval(timer);
  }, [isVoiceRecording]);

  // show a full-screen loader while core queries are still resolving
  if (profile === undefined || referrers === undefined) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mutedTeal} />
      </View>
    );
  }

  const hasInterview = Boolean(profile?.voiceInterviewId);
  const hasSketch = Boolean(assets?.sketch);
  const hasReferrers = (referrers?.length ?? 0) > 0;
  const hasRewardPool = Boolean(rewardPool);
  const activeIntroCount = (introductions ?? []).filter(
    (i: any) => i.status !== "closed" && i.status !== "paid",
  ).length;
  const referrerPortalCount = referrerInvites?.length ?? 0;

  async function startVoiceRecording() {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setVoiceError("Microphone permission is required.");
        setVoiceStatus("error");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setVoiceElapsed(0);
      setVoiceError("");
      setVoiceStatus("recording");
    } catch {
      setVoiceError("Could not start recording. Please try again.");
      setVoiceStatus("error");
    }
  }

  async function stopVoiceRecording() {
    setVoiceStatus("processing");

    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("No recording URI");

      const uploadUrl = await generateUploadUrl();
      const audioRes = await fetch(uri);
      const audioBlob = await audioRes.blob();
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/mp4" },
        body: audioBlob,
      });
      const { storageId } = await uploadRes.json();

      await transcribeAndSave({ storageId, email: user?.email });

      setVoiceSheetOpen(false);
      setVoiceStatus("idle");
      setVoiceElapsed(0);
      Alert.alert("Profile updated", "Your intro brief was refreshed.");
    } catch {
      setVoiceError("Transcription failed. Please try again.");
      setVoiceStatus("error");
    }
  }

  function openVoiceSheet() {
    setVoiceSheetOpen(true);
    setVoiceError("");
  }

  function closeVoiceSheet() {
    if (isVoiceProcessing || isVoiceRecording) return;
    setVoiceSheetOpen(false);
    setVoiceStatus("idle");
    setVoiceElapsed(0);
    setVoiceError("");
  }

  function handleVoiceCardPress() {
    if (isVoiceRecording) {
      void stopVoiceRecording();
      return;
    }
    void startVoiceRecording();
  }

  function goToStep(index: number) {
    const route = routeForStep(index);
    if (route === "voice") {
      openVoiceSheet();
      return;
    }
    router.push(route as any);
  }

  async function handleShareProfile() {
    if (!user?.email || sharing) return;
    setSharing(true);
    try {
      const token = await createShareLink({ email: user.email });
      const url = Linking.createURL(`/invite/${token}`);
      await Share.share({
        message: `I’d love your help making thoughtful introductions on Sohoist: ${url}`,
        url,
      });
    } catch (error) {
      Alert.alert(
        "Share unavailable",
        error instanceof Error
          ? error.message
          : "Please try again in a moment.",
      );
    } finally {
      setSharing(false);
    }
  }

  async function handlePlayReferrerNote(
    referrerName: string,
    voiceNoteUrl?: string | null,
  ) {
    if (!voiceNoteUrl) {
      Alert.alert(
        "No voice note yet",
        "This referrer has not attached a voice note yet.",
      );
      return;
    }

    if (voiceNoteUrl.startsWith("demo://")) {
      Alert.alert(
        "Voice note",
        `${referrerName} left a short note for this introduction.`,
      );
      return;
    }

    const canOpen = await Linking.canOpenURL(voiceNoteUrl);
    if (canOpen) {
      await Linking.openURL(voiceNoteUrl);
      return;
    }

    Alert.alert("Voice note unavailable", "This note cannot be opened here.");
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>Sohoist</Text>
          <Text style={styles.wordmarkLabel}>PRIVATE INTRODUCTIONS</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push(isAdmin ? "/admin" : "/ghost-mode")}
          activeOpacity={0.7}
        >
          <View
            style={[
              components.badge,
              isAdmin
                ? styles.adminBadge
                : profile?.ghostMode
                  ? styles.ghostBadgeOn
                  : styles.ghostBadgeOff,
            ]}
          >
            <Text style={components.badgeText}>
              {isAdmin
                ? "ADMIN"
                : profile?.ghostMode
                  ? "GHOST MODE"
                  : "PRIVACY"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {hasInterview ? (
        <HomeNav
          onProfile={() => router.push("/intro-brief")}
          onSettings={() => router.push("/settings" as any)}
        />
      ) : null}

      {/* ── body ───────────────────────────────────────────────────────────── */}

      {/* state a: no voice interview yet */}
      {!hasInterview && (
        <>
          <View style={components.paperCard}>
            <View style={[components.badge, styles.cardBadge]}>
              <Text style={components.badgeText}>STEP 1 OF 4</Text>
            </View>

            <Text style={styles.cardHeadline}>Create your intro brief.</Text>
            <Text style={styles.cardBody}>
              A short voice conversation generates your private profile. Takes
              about 5 minutes.
            </Text>

            <VoiceInputCard
              label="Tap to start speaking"
              detail="A quiet voice conversation becomes your private intro brief."
              onPress={openVoiceSheet}
              style={styles.voiceCard}
            />
          </View>

          <ProgressSteps
            states={["active", "empty", "empty", "empty"]}
            onStepPress={goToStep}
          />
        </>
      )}

      {/* state a2: has interview but no sketch yet */}
      {hasInterview && !hasSketch && (
        <>
          <View style={components.paperCard}>
            <View style={[components.badge, styles.cardBadge]}>
              <Text style={components.badgeText}>STEP 2 OF 4</Text>
            </View>

            <Text style={styles.cardHeadline}>Add your photo.</Text>
            <Text style={styles.cardBody}>
              We'll turn it into a private pencil sketch portrait. Referrers see
              the sketch — your photo stays private by default.
            </Text>

            <View style={components.divider} />

            <TouchableOpacity
              style={components.primaryButton}
              onPress={() => router.push("/photo-sketch")}
              activeOpacity={0.8}
            >
              <Text style={components.primaryButtonText}>Add photo →</Text>
            </TouchableOpacity>
          </View>

          <ProgressSteps
            states={["done", "active", "empty", "empty"]}
            onStepPress={goToStep}
          />
        </>
      )}

      {/* state b: has interview + sketch but no referrers */}
      {hasInterview && hasSketch && !hasReferrers && (
        <>
          <View style={components.paperCard}>
            <View style={[components.badge, styles.cardBadge]}>
              <Text style={components.badgeText}>STEP 3 OF 4</Text>
            </View>

            <Text style={styles.cardHeadline}>Invite your trusted circle.</Text>
            <Text style={styles.cardBody}>
              These are the people who know your taste and who you'd actually
              click with.
            </Text>

            <View style={components.divider} />

            <TouchableOpacity
              style={components.primaryButton}
              onPress={() => router.push("/invite-referrers")}
              activeOpacity={0.8}
            >
              <Text style={components.primaryButtonText}>
                Invite referrers →
              </Text>
            </TouchableOpacity>
          </View>

          <ProgressSteps
            states={[
              "done",
              "done",
              "active",
              hasRewardPool ? "done" : "empty",
            ]}
            onStepPress={goToStep}
          />
        </>
      )}

      {/* state c: has referrers — show the member dashboard; reward pool is optional */}
      {hasInterview && hasReferrers && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>TRUSTED REFERRERS</Text>
            <TouchableOpacity
              onPress={() => router.push("/invite-referrers")}
              activeOpacity={0.7}
            >
              <Text style={styles.editLink}>Manage</Text>
            </TouchableOpacity>
          </View>

          <View style={[components.paperCard, styles.referrerCard]}>
            {(referrers ?? []).slice(0, 4).map((referrer: any) => (
              <TrustedReferrerRow
                key={referrer._id}
                name={referrer.referrerName}
                intro={referrer.introPreview}
                status={referrer.status}
                hasVoiceNote={Boolean(referrer.voiceNoteUrl)}
                onPlay={() =>
                  handlePlayReferrerNote(
                    referrer.referrerName,
                    referrer.voiceNoteUrl,
                  )
                }
              />
            ))}
          </View>

          <VoiceInputCard
            label="Update your profile by voice"
            detail="The fastest way to refresh your intro brief without turning it into a form."
            onPress={openVoiceSheet}
            style={styles.dashboardVoiceCard}
          />

          <TouchableOpacity
            style={[components.primaryButton, styles.shareButton]}
            onPress={handleShareProfile}
            disabled={sharing}
            activeOpacity={0.82}
          >
            <Ionicons name="share-outline" size={18} color={colors.paper} />
            <Text style={components.primaryButtonText}>
              {sharing ? "Preparing..." : "Share my profile"}
            </Text>
          </TouchableOpacity>

          <View style={styles.quickRow}>
            <QuickActionCard
              count={String(referrers?.length ?? 0)}
              label="Referrers"
              onPress={() => router.push("/invite-referrers")}
            />
            <QuickActionCard
              count={String(activeIntroCount)}
              label="Active Intros"
              onPress={() => router.push("/intro-room")}
            />
          </View>

          {/* mini brief card */}
          <View style={[components.paperCard, styles.briefCard]}>
            <View style={styles.briefCardHeader}>
              <Text style={styles.briefHeadline}>
                {profile?.headline ?? "Your intro brief"}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/intro-brief")}
                activeOpacity={0.7}
              >
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* tags — up to 3 */}
            {profile?.tags && profile.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {profile.tags.slice(0, 3).map((tag: string) => (
                  <View key={tag} style={[components.badge, styles.tag]}>
                    <Text style={components.badgeText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.visibilityLine}>
              {profile?.ghostMode
                ? "Ghost mode — hidden"
                : "Visible to referrers only"}
            </Text>
          </View>

          {referrerPortalCount > 0 ? (
            <TouchableOpacity
              style={[components.secondaryButton, styles.referrerPortalButton]}
              onPress={() => router.push("/referrer-portal" as any)}
              activeOpacity={0.75}
            >
              <Text style={components.secondaryButtonText}>
                Referrer portal ({referrerPortalCount}) →
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* brief section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>YOUR INTRO BRIEF</Text>
            <TouchableOpacity
              onPress={() => router.push("/intro-brief")}
              activeOpacity={0.7}
            >
              <Text style={styles.editLink}>Edit profile</Text>
            </TouchableOpacity>
          </View>

          <View style={components.paperCard}>
            {profile?.bio ? (
              <Text style={styles.bioText}>{profile.bio}</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>
                Your intro brief will appear here after your voice profile is
                reviewed.
              </Text>
            )}
          </View>
        </>
      )}

      <Modal
        visible={voiceSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={closeVoiceSheet}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeVoiceSheet} />
        <View style={styles.voiceSheet}>
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Talk to Sohoist.</Text>
              <Text style={styles.sheetSubtitle}>
                Update your profile from here.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sheetClose}
              onPress={closeVoiceSheet}
              activeOpacity={0.72}
            >
              <Ionicons name="close" size={18} color={colors.stone} />
            </TouchableOpacity>
          </View>

          <VoiceInputCard
            active={isVoiceRecording}
            disabled={isVoiceProcessing}
            label={
              isVoiceProcessing
                ? "Creating your update..."
                : isVoiceRecording
                  ? "Listening..."
                  : "Tap to speak"
            }
            timer={isVoiceRecording ? formatVoiceTime(voiceElapsed) : undefined}
            detail="Speak naturally. The agent will turn it into profile context."
            onPress={handleVoiceCardPress}
            style={styles.sheetVoiceCard}
          />

          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>You can talk about:</Text>
            {VOICE_PROMPTS.map((prompt) => (
              <View key={prompt} style={styles.promptRow}>
                <Text style={styles.promptDot}>•</Text>
                <Text style={styles.promptText}>{prompt}</Text>
              </View>
            ))}
          </View>

          {voiceStatus === "error" ? (
            <Text style={styles.voiceError}>{voiceError}</Text>
          ) : null}
        </View>
      </Modal>
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
    paddingBottom: 60,
  },

  /* header */
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    marginBottom: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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

  /* card internals */
  cardBadge: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  cardHeadline: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 4,
  },
  whatIsThisBtn: {
    marginTop: 10,
  },

  /* steps indicator */
  stepsWrap: {
    marginTop: 20,
    padding: 8,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.12)",
    backgroundColor: "rgba(239, 231, 220, 0.38)",
  },

  /* mini brief card */
  briefCard: {
    marginBottom: 14,
  },
  briefCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  briefHeadline: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
    flex: 1,
    marginRight: 12,
  },
  editLink: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedTeal,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    alignSelf: "flex-start",
  },
  visibilityLine: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
  },

  /* quick actions */
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  referrerPortalButton: {
    marginBottom: 24,
  },
  referrerCard: {
    paddingTop: 2,
    paddingBottom: 2,
    marginBottom: 14,
  },
  dashboardVoiceCard: {
    marginBottom: 12,
  },
  shareButton: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  /* brief section */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
  },
  bioText: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 24,
  },
  bioPlaceholder: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.stone,
    lineHeight: 24,
    opacity: 0.65,
  },

  /* ghost mode badge variants */
  ghostBadgeOn: {
    backgroundColor: "rgba(43, 42, 40, 0.08)",
    borderColor: "rgba(43, 42, 40, 0.2)",
  },
  ghostBadgeOff: {
    backgroundColor: "rgba(220, 230, 234, 0.72)",
    borderColor: "rgba(143, 175, 179, 0.3)",
  },
  adminBadge: {
    backgroundColor: "rgba(214, 181, 109, 0.18)",
    borderColor: "rgba(122, 92, 20, 0.22)",
  },
  voiceCard: {
    marginTop: 8,
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(43, 42, 40, 0.28)",
  },
  voiceSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "86%",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.screenH,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 22,
    ...shadow.elevated,
  },
  sheetGrabber: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(93, 90, 87, 0.22)",
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    marginTop: 3,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warmIvory,
  },
  sheetVoiceCard: {
    marginBottom: 12,
  },
  promptCard: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
  },
  promptTitle: {
    fontFamily: fonts.displayItalic,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 8,
  },
  promptRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  promptDot: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedTeal,
    marginTop: 1,
  },
  promptText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.stone,
  },
  voiceError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#C0392B",
    textAlign: "center",
    marginTop: 12,
  },
});
