import { useState, useEffect, useRef } from "react";
import {
  Animated,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useAction } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing, shadow } from "../theme";
import { useNativeAuth } from "../auth";

// expo-av requires a development build — not available in Expo Go
let Audio: any = null;
try {
  Audio = require("expo-av").Audio;
} catch {
  // will show "dev build required" when user tries to record
}

const NEEDS_DEV_BUILD = Audio === null;

const { width } = Dimensions.get("window");
const NUM_BARS = 30;
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

  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const recordingRef = useRef<any>(null);

  // waveform bar animations
  const barAnims = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.08)),
  ).current;

  // mic circle pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── animate waveform when recording ───────────────────────────────────
  useEffect(() => {
    if (status !== "recording") {
      barAnims.forEach((a) => a.setValue(0.08));
      return;
    }
    const anims = barAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i * 35) % 180),
          Animated.timing(anim, {
            toValue: Math.random() * 0.75 + 0.15,
            duration: 140 + Math.random() * 220,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.08,
            duration: 140 + Math.random() * 220,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [status]);

  // ── mic pulse when recording ───────────────────────────────────────────
  useEffect(() => {
    if (status !== "recording") {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.07,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [status]);

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
    if (NEEDS_DEV_BUILD) {
      setErrorMsg(
        "Voice recording requires a development build. Run `npx expo run:ios` once to enable it.",
      );
      setStatus("error");
      return;
    }
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setErrorMsg("Microphone permission is required.");
        setStatus("error");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: ".m4a",
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: "aac" as any,
          audioQuality: 127, // MAX
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
      });
      recordingRef.current = recording;
      setElapsed(0);
      setStatus("recording");
    } catch (e) {
      setErrorMsg("Could not start recording. Please try again.");
      setStatus("error");
    }
  }

  async function stopAndTranscribe() {
    const rec = recordingRef.current;
    if (!rec) return;
    setStatus("processing");

    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
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

      {/* ── mic circle ──────────────────────────────────────────────────── */}
      <View style={styles.micArea}>
        {/* outer glow ring — visible when recording */}
        {isRecording && (
          <Animated.View
            style={[styles.micRing, { transform: [{ scale: pulseAnim }] }]}
          />
        )}

        <Animated.View
          style={[
            styles.micCircle,
            isRecording && styles.micCircleActive,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons
            name={isRecording ? "mic" : "mic-outline"}
            size={52}
            color={isRecording ? colors.mutedTeal : colors.stone}
          />
        </Animated.View>

        {/* waveform */}
        <View style={styles.waveform}>
          {barAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [3, 44],
                  }),
                  opacity: isRecording ? 1 : 0.3,
                },
              ]}
            />
          ))}
        </View>

        {/* status label + timer */}
        <Text style={styles.statusLabel}>
          {isProcessing
            ? "Creating your profile…"
            : isRecording
              ? "Listening…"
              : NEEDS_DEV_BUILD
                ? "Requires development build"
                : "Tap to start speaking"}
        </Text>
        {isRecording && <Text style={styles.timer}>{formatTime(elapsed)}</Text>}
      </View>

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

  /* mic area */
  micArea: {
    alignItems: "center",
    marginBottom: 24,
  },
  micRing: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.35)",
    top: -10,
  },
  micCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "rgba(220, 230, 234, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  micCircleActive: {
    backgroundColor: "rgba(143, 175, 179, 0.18)",
    borderColor: "rgba(143, 175, 179, 0.55)",
  },

  /* waveform */
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    gap: 3,
    marginBottom: 12,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.mutedTeal,
  },

  statusLabel: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.stone,
    textAlign: "center",
  },
  timer: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.stone,
    marginTop: 4,
    textAlign: "center",
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
