import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CityInput from "../components/CityInput";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { colors, fonts, radius, spacing, shadow } from "../theme";
import { useNativeAuth } from "../auth";

const DRAFT_KEY = "sohoist:application_draft";

const PSEUDONYM_POOL = [
  "Vivienne",
  "Margot",
  "Elias",
  "Cleo",
  "Julian",
  "Iris",
  "August",
  "Simone",
  "Felix",
  "Celeste",
  "Rowan",
  "Sable",
  "Cassian",
  "Lyra",
  "Emmett",
  "Sylvie",
  "Dorian",
  "Isadora",
  "Leander",
  "Maren",
];

function suggestPseudonym() {
  return PSEUDONYM_POOL[Math.floor(Math.random() * PSEUDONYM_POOL.length)]!;
}

const RELATIONSHIP_INTENTS = [
  "A serious, committed relationship",
  "Open to seeing what happens",
  "Companionship and meaningful connection",
  "Eventually settling down, no rush",
];

export default function ApplicationScreen() {
  const { user } = useNativeAuth();
  const router = useRouter();
  const submitApplication = useMutation(api.applications.submitApplication);

  const [pseudonym, setPseudonym] = useState(suggestPseudonym);
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [relationshipIntent, setRelationshipIntent] = useState("");
  const [whySohoist, setWhySohoist] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // restore draft on mount
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d.pseudonym) setPseudonym(d.pseudonym);
          if (d.city) setCity(d.city);
          if (d.profession) setProfession(d.profession);
          if (d.relationshipIntent) setRelationshipIntent(d.relationshipIntent);
          if (d.whySohoist) setWhySohoist(d.whySohoist);
        } catch {}
      }
      setDraftLoaded(true);
    });
  }, []);

  // persist draft whenever any field changes (only after initial load to avoid clobbering)
  useEffect(() => {
    if (!draftLoaded) return;
    AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        pseudonym,
        city,
        profession,
        relationshipIntent,
        whySohoist,
      }),
    ).catch(() => {});
  }, [
    draftLoaded,
    pseudonym,
    city,
    profession,
    relationshipIntent,
    whySohoist,
  ]);

  const name = user?.name ?? "";
  const email = user?.email ?? "";

  const canSubmit =
    city.trim() &&
    profession.trim() &&
    relationshipIntent &&
    whySohoist.trim().length >= 20;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitApplication({
        name,
        pseudonym: pseudonym.trim() || undefined,
        email,
        city,
        profession,
        relationshipIntent,
        whySohoist,
      });
      await AsyncStorage.removeItem(DRAFT_KEY);
      router.replace("/pending");
    } catch (e: any) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

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
          <Text style={styles.wordmark}>Sohoist</Text>
          <Text style={styles.wordmarkLabel}>PRIVATE INTRODUCTIONS</Text>
        </View>

        <Text style={styles.headline}>Apply privately.</Text>
        <Text style={styles.subline}>
          Sohoist is built for thoughtful introductions, not public browsing.
        </Text>

        {/* pre-filled name row */}
        {name ? (
          <>
            <View style={[styles.prefilled, { marginBottom: 8 }]}>
              <Text style={styles.prefilledLabel}>Name</Text>
              <Text style={styles.prefilledValue}>{name}</Text>
            </View>
          </>
        ) : null}

        {/* pseudonym */}
        <View style={styles.field}>
          <Text style={styles.label}>Preferred name</Text>
          <Text style={[styles.fieldHint, { marginBottom: 20 }]}>
            Keep your identity private.
          </Text>
          <TextInput
            style={styles.input}
            value={pseudonym}
            onChangeText={setPseudonym}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* city */}
        <View style={[styles.field, { zIndex: 10 }]}>
          <Text style={styles.label}>City</Text>
          <CityInput
            value={city}
            onChange={setCity}
            inputStyle={styles.input}
          />
        </View>

        {/* profession */}
        <View style={styles.field}>
          <Text style={styles.label}>Profession / Background</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Founder, designer, physician..."
            placeholderTextColor={colors.stone + "80"}
            value={profession}
            onChangeText={setProfession}
            autoCapitalize="words"
          />
        </View>

        {/* relationship intent — select */}
        <View style={styles.field}>
          <Text style={styles.label}>Relationship Intent</Text>
          {RELATIONSHIP_INTENTS.map((intent) => (
            <TouchableOpacity
              key={intent}
              style={[
                styles.intentOption,
                relationshipIntent === intent && styles.intentOptionSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => setRelationshipIntent(intent)}
            >
              <View
                style={[
                  styles.radio,
                  relationshipIntent === intent && styles.radioSelected,
                ]}
              />
              <Text
                style={[
                  styles.intentText,
                  relationshipIntent === intent && styles.intentTextSelected,
                ]}
              >
                {intent}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* why sohoist */}
        <View style={styles.field}>
          <Text style={styles.label}>Why Sohoist?</Text>
          <Text style={styles.fieldHint}>
            Tell us a little about what you're looking for and why introductions
            through friends feels right.
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="I've been on the apps and it never felt quite right. I'd rather meet someone through..."
            placeholderTextColor={colors.stone + "80"}
            value={whySohoist}
            onChangeText={setWhySohoist}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{whySohoist.length} / 500</Text>
        </View>

        {/* privacy note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyText}>
            Private by default. Your application is reviewed by our team only —
            never shown publicly.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!canSubmit || submitting) && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={styles.submitButtonText}>Submit application →</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenH,
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 40,
    paddingBottom: 8,
    marginBottom: 24,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 24,
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
  headline: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 32,
  },
  prefilled: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.18)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prefilledLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
  },
  prefilledValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone,
    marginBottom: 8,
  },
  fieldHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
    lineHeight: 19,
    marginBottom: 8,
    opacity: 0.75,
  },
  input: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.18)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    ...shadow.subtle,
  },
  textarea: {
    minHeight: 120,
    paddingTop: 14,
  },
  charCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.stone,
    opacity: 0.5,
    textAlign: "right",
    marginTop: 4,
  },
  intentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.18)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    ...shadow.subtle,
  },
  intentOptionSelected: {
    borderColor: colors.mutedTeal,
    backgroundColor: "rgba(220, 230, 234, 0.45)",
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(93, 90, 87, 0.35)",
    marginRight: 12,
  },
  radioSelected: {
    borderColor: colors.mutedTeal,
    backgroundColor: colors.mutedTeal,
  },
  intentText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },
  intentTextSelected: {
    fontFamily: fonts.bodyMedium,
  },
  privacyNote: {
    backgroundColor: "rgba(220, 230, 234, 0.45)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.3)",
    padding: 14,
    marginBottom: 24,
  },
  privacyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    lineHeight: 18,
    textAlign: "center",
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#C0392B",
    textAlign: "center",
    marginBottom: 12,
  },
  submitButton: {
    height: spacing.ctaHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.paper,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.paper,
  },
});
