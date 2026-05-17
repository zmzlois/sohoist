import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useMutation, useAction } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing, shadow } from "../theme";
import { useNativeAuth } from "../auth";
import VoiceInputCard from "../components/VoiceInputCard";

const { width } = Dimensions.get("window");
const TOPICS = [
  "Who you are",
  "What you're looking for",
  "Your values & lifestyle",
  "Dealbreakers (so we can filter better)",
];

type Status = "idle" | "recording" | "processing" | "error";

export default function VoiceProfileScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();
  const generateUploadUrl = useMutation(api.voice.generateUploadUrl);
  const transcribeAndSave = useAction(api.voice.transcribeAndSave);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // ── elapsed timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "recording") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── recording controls ─────────────────────────────────────────────────
  async function startRecording() {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setErrorMsg("Microphone permission is required.");
        setStatus("error");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setElapsed(0);
      setStatus("recording");
    } catch (e) {
      setErrorMsg("Could not start recording. Please try again.");
      setStatus("error");
    }
  }

  async function stopAndTranscribe() {
    setStatus("processing");

    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("No recording URI");

      // upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const audioRes = await fetch(uri);
      const audioBlob = await audioRes.blob();
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/mp4" },
        body: audioBlob,
      });
      const { storageId } = await uploadRes.json();

      // transcribe + extract + save
      await transcribeAndSave({ storageId, email: user?.email });

      router.replace("/voice-reveal");
    } catch (e) {
      setErrorMsg("Transcription failed. Please try again.");
      setStatus("error");
    }
  }

  const isRecording = status === "recording";
  const isProcessing = status === "processing";

  return (
    <View style={styles.root}>
      {/* ── close / back ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
      >
        <Ionicons name="close" size={22} color={colors.stone} />
      </TouchableOpacity>

      {/* ── headline ────────────────────────────────────────────────────── */}
      <View style={styles.headlineArea}>
        <Text style={styles.title}>Let's get to know you.</Text>
        <Text style={styles.subtitle}>
          I'll help you create a profile that{"\n"}feels true to you.
        </Text>
      </View>

      <VoiceInputCard
        active={isRecording}
        disabled={isProcessing}
        onPress={isRecording ? stopAndTranscribe : startRecording}
        label={
          isProcessing
            ? "Creating your profile..."
            : isRecording
              ? "Listening..."
              : "Tap to start speaking"
        }
        timer={isRecording ? formatTime(elapsed) : undefined}
        detail="Your voice becomes an editorial intro brief."
        style={styles.voiceCard}
      />

      {/* ── topics card ─────────────────────────────────────────────────── */}
      <View style={styles.cardWrap}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>We'll talk about:</Text>
          {TOPICS.map((topic) => (
            <View key={topic} style={styles.topicRow}>
              <Text style={styles.topicCheck}>✓</Text>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── bottom CTA ──────────────────────────────────────────────────── */}
      <View style={styles.bottomArea}>
        {status === "error" && <Text style={styles.errorText}>{errorMsg}</Text>}

        {isProcessing ? (
          <View style={styles.ctaPill}>
            <ActivityIndicator color={colors.ink} size="small" />
            <Text style={[styles.ctaText, { marginLeft: 10 }]}>
              Transcribing…
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.ctaPill, isRecording && styles.ctaPillRecording]}
            activeOpacity={0.75}
            onPress={isRecording ? stopAndTranscribe : startRecording}
          >
            <Text
              style={[styles.ctaText, isRecording && styles.ctaTextRecording]}
            >
              {isRecording ? "Tap to stop" : "Tap to start speaking →"}
            </Text>
            {isRecording && <View style={styles.stopSquare} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.laterBtn}
          onPress={() => router.replace("/home")}
          activeOpacity={0.6}
        >
          <Text style={styles.laterText}>Save & finish later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.screenH,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },

  /* close button */
  closeBtn: {
    marginTop: Platform.OS === "ios" ? 60 : 36,
    alignSelf: "flex-start",
  },

  /* headline */
  headlineArea: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 28,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    textAlign: "center",
  },

  voiceCard: {
    marginBottom: 24,
  },

  /* topics card — slight tilt for paper feel */
  cardWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(120, 100, 75, 0.14)",
    padding: 20,
    width: width - spacing.screenH * 2 - 12,
    transform: [{ rotate: "-1.5deg" }],
    ...shadow.paper,
  },
  cardTitle: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 12,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 7,
  },
  topicCheck: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.mutedTeal,
    marginRight: 10,
    marginTop: 1,
  },
  topicText: {
    fontFamily: fonts.displayItalic,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    lineHeight: 20,
  },

  /* bottom */
  bottomArea: {
    gap: 10,
    paddingTop: 12,
  },
  ctaPill: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.warmIvory,
    borderWidth: 1,
    borderColor: "rgba(43,42,40,0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.subtle,
  },
  ctaPillRecording: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  ctaText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  ctaTextRecording: {
    color: colors.paper,
  },
  stopSquare: {
    width: 10,
    height: 10,
    backgroundColor: colors.paper,
    borderRadius: 2,
    marginLeft: 10,
  },
  laterBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  laterText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    opacity: 0.7,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#C0392B",
    textAlign: "center",
  },
});
