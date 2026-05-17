import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNativeAuth } from "../auth";
import { colors, fonts, radius, spacing, shadow, components } from "../theme";

// expo-image-picker requires a dev build — graceful fallback if not available
let ImagePicker: any = null;
try {
  ImagePicker = require("expo-image-picker");
} catch {
  // will show "dev build required" prompt
}

const NEEDS_DEV_BUILD = ImagePicker === null;

type SketchStyle = "soft_graphite" | "editorial_pencil" | "watercolor_portrait" | "minimal_line";

const SKETCH_STYLES: { value: SketchStyle; label: string; note: string }[] = [
  { value: "soft_graphite", label: "Soft graphite", note: "Warm, intimate shading" },
  { value: "editorial_pencil", label: "Editorial pencil", note: "Clean, confident linework" },
  { value: "watercolor_portrait", label: "Watercolor", note: "Soft edges, subtle colour" },
  { value: "minimal_line", label: "Minimal line", note: "Single-line elegance" },
];

type PhotoVisibility = "sketch_only" | "photo_only" | "both" | "photo_after_approval";

const VISIBILITY_OPTIONS: { value: PhotoVisibility; label: string; note: string }[] = [
  { value: "sketch_only", label: "Sketch only", note: "Referrers see the sketch, not your photo." },
  { value: "photo_after_approval", label: "Photo after approval", note: "Photo unlocks when you accept an intro." },
  { value: "both", label: "Both", note: "Sketch shown first; photo visible to referrers." },
  { value: "photo_only", label: "Photo only", note: "Original photo shown to approved referrers." },
];

type Status = "idle" | "picking" | "uploading" | "uploaded" | "generating" | "done" | "error";

export default function PhotoSketchScreen() {
  const router = useRouter();
  const { user } = useNativeAuth();

  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const savePhoto = useMutation(api.photos.savePhoto);
  const generateSketch = useAction(api.photos.generateSketch);
  const setPhotoVisibility = useMutation(api.photos.setPhotoVisibility);

  const assets = useQuery(
    api.photos.getMyAssets,
    user?.email ? { email: user.email } : "skip",
  );

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [uploadedStorageId, setUploadedStorageId] = useState<string | null>(null);
  const [sketchStyle, setSketchStyle] = useState<SketchStyle>("soft_graphite");
  const [sketchUrl, setSketchUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PhotoVisibility>("sketch_only");
  const [savingVisibility, setSavingVisibility] = useState(false);

  const hasExistingSketch = Boolean(assets?.sketch?.url);

  async function pickPhoto() {
    if (NEEDS_DEV_BUILD) {
      setErrorMsg("Photo upload requires a development build. Run `npx expo run:ios` once to enable it.");
      setStatus("error");
      return;
    }

    const { status: permStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== "granted") {
      setErrorMsg("Photo library permission is required.");
      setStatus("error");
      return;
    }

    setStatus("picking");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      setStatus("idle");
      return;
    }

    const asset = result.assets[0];
    setLocalPhotoUri(asset.uri);
    await uploadPhoto(asset.uri);
  }

  async function uploadPhoto(uri: string) {
    setStatus("uploading");
    setErrorMsg("");
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uri);
      const blob = await res.blob();

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      const { storageId } = (await uploadRes.json()) as { storageId: string };

      await savePhoto({ storageId, email: user?.email });
      setUploadedStorageId(storageId);
      setStatus("uploaded");
    } catch {
      setErrorMsg("Upload failed. Please try again.");
      setStatus("error");
    }
  }

  async function handleGenerateSketch() {
    if (!uploadedStorageId) return;
    setStatus("generating");
    setErrorMsg("");
    try {
      await generateSketch({
        photoStorageId: uploadedStorageId,
        style: sketchStyle,
        email: user?.email,
      });
      // re-fetch assets to get the new sketch URL
      // assets query will reactively update — wait for it
      setStatus("done");
    } catch {
      setErrorMsg("Sketch generation failed. Please try again.");
      setStatus("error");
    }
  }

  async function handleSaveVisibility() {
    setSavingVisibility(true);
    try {
      await setPhotoVisibility({ photoVisibility: visibility, email: user?.email });
      router.back();
    } finally {
      setSavingVisibility(false);
    }
  }

  const isProcessing = status === "uploading" || status === "generating" || status === "picking";

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

      <Text style={styles.headline}>Your pencil portrait.</Text>
      <Text style={styles.subline}>
        A softer way to be seen before an introduction.
      </Text>

      {/* ── photo + sketch preview ─────────────────────────────────────── */}
      <View style={styles.previewRow}>
        {/* photo side */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>PHOTO</Text>
          {localPhotoUri ? (
            <Image source={{ uri: localPhotoUri }} style={styles.previewImage} />
          ) : assets?.photo?.url ? (
            <Image source={{ uri: assets.photo.url }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderText}>No photo yet</Text>
            </View>
          )}
        </View>

        {/* sketch side */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>SKETCH</Text>
          {status === "generating" ? (
            <View style={[styles.previewPlaceholder, styles.generatingState]}>
              <ActivityIndicator color={colors.mutedTeal} />
              <Text style={styles.generatingText}>Drawing…</Text>
            </View>
          ) : sketchUrl || assets?.sketch?.url ? (
            <Image
              source={{ uri: sketchUrl ?? assets?.sketch?.url! }}
              style={styles.previewImage}
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderText}>Not yet generated</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── pick photo CTA ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          components.secondaryButton,
          styles.pickBtn,
          isProcessing && styles.disabledBtn,
        ]}
        onPress={pickPhoto}
        disabled={isProcessing}
        activeOpacity={0.75}
      >
        {status === "uploading" || status === "picking" ? (
          <ActivityIndicator color={colors.ink} size="small" />
        ) : (
          <Text style={components.secondaryButtonText}>
            {localPhotoUri || assets?.photo ? "Change photo" : "Choose photo →"}
          </Text>
        )}
      </TouchableOpacity>

      {/* ── sketch style selector ──────────────────────────────────────── */}
      {(status === "uploaded" || hasExistingSketch || uploadedStorageId) && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Sketch style</Text>
          <View style={styles.styleGrid}>
            {SKETCH_STYLES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.styleCard,
                  sketchStyle === s.value && styles.styleCardSelected,
                ]}
                onPress={() => setSketchStyle(s.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.styleLabel,
                  sketchStyle === s.value && styles.styleLabelSelected,
                ]}>
                  {s.label}
                </Text>
                <Text style={styles.styleNote}>{s.note}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              components.primaryButton,
              styles.generateBtn,
              status === "generating" && styles.disabledBtn,
            ]}
            onPress={handleGenerateSketch}
            disabled={status === "generating" || !uploadedStorageId}
            activeOpacity={0.85}
          >
            {status === "generating" ? (
              <ActivityIndicator color={colors.paper} size="small" />
            ) : (
              <Text style={components.primaryButtonText}>
                {hasExistingSketch ? "Regenerate sketch →" : "Generate sketch →"}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ── visibility controls (shown after sketch exists) ───────────── */}
      {(status === "done" || hasExistingSketch) && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Who sees your photo</Text>

          {VISIBILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.visOption,
                visibility === opt.value && styles.visOptionSelected,
              ]}
              onPress={() => setVisibility(opt.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, visibility === opt.value && styles.radioSelected]} />
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.visLabel,
                  visibility === opt.value && styles.visLabelSelected,
                ]}>
                  {opt.label}
                </Text>
                <Text style={styles.visNote}>{opt.note}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[components.primaryButton, { marginTop: 16 }]}
            onPress={handleSaveVisibility}
            disabled={savingVisibility}
            activeOpacity={0.85}
          >
            {savingVisibility ? (
              <ActivityIndicator color={colors.paper} size="small" />
            ) : (
              <Text style={components.primaryButtonText}>Save →</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* error */}
      {status === "error" && (
        <Text style={styles.errorText}>{errorMsg}</Text>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const CARD_SIZE = 148;

const styles = StyleSheet.create({
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
  headline: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subline: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    color: colors.stone,
    lineHeight: 22,
    marginBottom: 24,
  },

  // preview
  previewRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  previewCard: {
    flex: 1,
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.14)",
    padding: 10,
    alignItems: "center",
    ...shadow.subtle,
  },
  previewLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.stone,
    marginBottom: 8,
  },
  previewImage: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: radius.sm,
  },
  previewPlaceholder: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: radius.sm,
    backgroundColor: "rgba(93, 90, 87, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.12)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  previewPlaceholderText: {
    fontFamily: fonts.displayItalic,
    fontSize: 13,
    color: colors.stone,
    opacity: 0.6,
    textAlign: "center",
  },
  generatingState: {
    gap: 10,
  },
  generatingText: {
    fontFamily: fonts.displayItalic,
    fontSize: 13,
    color: colors.mutedTeal,
  },

  pickBtn: {
    marginBottom: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  generateBtn: {
    marginTop: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(93, 90, 87, 0.14)",
    marginVertical: 20,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 10,
  },

  // sketch style grid — 2x2
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  styleCard: {
    width: "48%",
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.14)",
    padding: 12,
    ...shadow.subtle,
  },
  styleCardSelected: {
    borderColor: colors.mutedTeal,
    backgroundColor: "rgba(220, 230, 234, 0.4)",
  },
  styleLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 3,
  },
  styleLabelSelected: {
    color: colors.ink,
  },
  styleNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.stone,
    lineHeight: 15,
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
    marginBottom: 8,
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
  visLabelSelected: { fontFamily: fonts.bodyMedium },
  visNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    lineHeight: 17,
  },

  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#C0392B",
    textAlign: "center",
    marginTop: 16,
  },
});
