import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadow } from "../theme";

const BAR_COUNT = 32;

type VoiceInputCardProps = {
  active?: boolean;
  disabled?: boolean;
  label: string;
  detail?: string;
  timer?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export default function VoiceInputCard({
  active = false,
  disabled = false,
  label,
  detail,
  timer,
  onPress,
  style,
}: VoiceInputCardProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.1)),
  ).current;

  useEffect(() => {
    if (!active) {
      pulse.setValue(1);
      bars.forEach((bar, index) => bar.setValue(index % 3 === 0 ? 0.22 : 0.1));
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 860,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 860,
          useNativeDriver: true,
        }),
      ]),
    );

    const barAnimations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((index * 31) % 210),
          Animated.timing(bar, {
            toValue: 0.35 + ((index * 17) % 55) / 100,
            duration: 180 + ((index * 23) % 140),
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.12,
            duration: 160 + ((index * 19) % 120),
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    pulseAnimation.start();
    barAnimations.forEach((animation) => animation.start());

    return () => {
      pulseAnimation.stop();
      barAnimations.forEach((animation) => animation.stop());
    };
  }, [active, bars, pulse]);

  return (
    <TouchableOpacity
      activeOpacity={onPress && !disabled ? 0.78 : 1}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.card,
        active && styles.cardActive,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.micStage}>
        {active ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pulseRing, { transform: [{ scale: pulse }] }]}
          />
        ) : null}

        <Animated.View
          style={[
            styles.micCircle,
            active && styles.micCircleActive,
            { transform: [{ scale: pulse }] },
          ]}
        >
          <Ionicons
            name={active ? "mic" : "mic-outline"}
            size={44}
            color={active ? colors.mutedTeal : colors.stone}
          />
        </Animated.View>

        <View style={styles.waveform}>
          {bars.map((bar, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  height: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 42],
                  }),
                  opacity: active ? 1 : 0.42,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.label}>{label}</Text>
      {timer ? <Text style={styles.timer}>{timer}</Text> : null}
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.22)",
    backgroundColor: "rgba(245, 239, 230, 0.62)",
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    overflow: "hidden",
    ...shadow.subtle,
  },
  cardActive: {
    borderColor: "rgba(143, 175, 179, 0.42)",
    backgroundColor: "rgba(220, 230, 234, 0.34)",
  },
  disabled: {
    opacity: 0.58,
  },
  micStage: {
    width: "100%",
    alignItems: "center",
    marginBottom: 14,
  },
  pulseRing: {
    position: "absolute",
    top: -8,
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 1,
    borderColor: "rgba(143, 175, 179, 0.38)",
  },
  micCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.18)",
    backgroundColor: "rgba(255, 252, 244, 0.78)",
    marginBottom: 18,
  },
  micCircleActive: {
    borderColor: "rgba(143, 175, 179, 0.58)",
    backgroundColor: "rgba(143, 175, 179, 0.16)",
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    gap: 3,
  },
  waveBar: {
    width: 2,
    borderRadius: 2,
    backgroundColor: colors.mutedTeal,
  },
  label: {
    fontFamily: fonts.displayItalic,
    fontSize: 18,
    color: colors.ink,
    textAlign: "center",
  },
  timer: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.stone,
    marginTop: 5,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.stone,
    textAlign: "center",
    marginTop: 8,
  },
});
