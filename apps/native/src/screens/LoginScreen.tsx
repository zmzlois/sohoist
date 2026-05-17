import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { brand, heroOverlay, logo } from "@packages/ui";
import { nativeImages } from "@packages/ui/assets/native";
import { colors, fonts, radius, shadow } from "../theme";
import { useNativeAuth } from "../auth";

const { width, height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.58;

const LoginScreen = () => {
  const router = useRouter();
  const { signIn } = useNativeAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch {
      setError("Those details did not match.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── hero image ─────────────────────────────────────────── */}
      <ImageBackground
        source={nativeImages.heroDinner}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroScrim} pointerEvents="none" />
        <View style={styles.heroTopScrim} pointerEvents="none" />

        <View style={styles.heroHeader}>
          {/* top-left wordmark */}
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkName}>{brand.name}</Text>
            <Text style={styles.wordmarkDescriptor}>{brand.descriptor}</Text>
          </View>

          <View style={styles.logoMark}>
            <Image
              source={nativeImages.logoMark}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* gradient fade into paper */}
        <View style={styles.heroFade} pointerEvents="none" />
      </ImageBackground>

      {/* ── auth panel ─────────────────────────────────────────── */}
      <View style={styles.panel}>
        <Text style={styles.headline}>Join Sohoist.</Text>
        <Text style={styles.subline}>
          Meet through people who know your vibe.
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="rgba(93,90,87,0.58)"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="rgba(93,90,87,0.58)"
            autoCapitalize="none"
            autoComplete="password"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.75}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.paper} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>private by default</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.disclaimer}>
          Your profile is never public unless you choose.{"\n"}
          Only trusted people can make introductions.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },

  /* hero image block */
  hero: {
    width: width,
    height: HERO_HEIGHT,
    justifyContent: "space-between",
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: heroOverlay.native.scrim,
  },
  heroTopScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: heroOverlay.native.topScrim,
  },
  heroHeader: {
    position: "relative",
    zIndex: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 32,
    paddingHorizontal: 24,
  },
  wordmark: {
    flexShrink: 1,
  },
  wordmarkName: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  wordmarkDescriptor: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  logoMark: {
    width: logo.nativeSize,
    height: logo.nativeSize,
    borderRadius: logo.nativeSize / 2,
    overflow: "hidden",
    backgroundColor: "rgba(245,239,230,0.14)",
    borderWidth: 1,
    borderColor: "rgba(245,239,230,0.26)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  /* gradient fade: photo → paper color */
  heroFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.38,
    /* RN doesn't support CSS gradients natively — use a layered approach */
    backgroundColor: colors.paper,
    opacity: 0,
    /* We layer a real gradient via the panel's negative marginTop */
  },

  /* auth panel */
  panel: {
    flex: 1,
    backgroundColor: colors.paper,
    marginTop: -28,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    lineHeight: 21,
    marginBottom: 28,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderGraphite,
    height: 50,
    paddingHorizontal: 18,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    ...shadow.subtle,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    paddingHorizontal: 4,
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    height: 50,
    ...shadow.subtle,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.paper,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderGraphite,
  },
  dividerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: colors.stone,
    marginHorizontal: 12,
  },
  disclaimer: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.stone,
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.75,
  },
});

export default LoginScreen;
