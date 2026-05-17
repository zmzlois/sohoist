import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { colors, fonts, radius, shadow } from "../theme";

const CITIES = [
  "Austin", "Atlanta", "Amsterdam", "Barcelona", "Berlin", "Boston",
  "Brisbane", "Brussels", "Buenos Aires", "Chicago", "Copenhagen",
  "Dallas", "Denver", "Dubai", "Dublin", "Edinburgh", "Hong Kong",
  "Houston", "Istanbul", "Jakarta", "Johannesburg", "Lagos", "Lisbon",
  "London", "Los Angeles", "Madrid", "Manchester", "Melbourne",
  "Mexico City", "Miami", "Milan", "Minneapolis", "Montreal",
  "Mumbai", "Munich", "Nashville", "New York", "Oslo", "Paris",
  "Philadelphia", "Phoenix", "Portland", "Prague", "Rome", "San Diego",
  "San Francisco", "São Paulo", "Seattle", "Seoul", "Shanghai",
  "Singapore", "Stockholm", "Sydney", "Taipei", "Tel Aviv", "Tokyo",
  "Toronto", "Vancouver", "Vienna", "Warsaw", "Washington DC", "Zurich",
];

interface Props {
  value: string;
  onChange: (city: string) => void;
  inputStyle?: object;
}

export default function CityInput({ value, onChange, inputStyle }: Props) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = value.trim().length > 0
    ? CITIES.filter((c) => c.toLowerCase().startsWith(value.toLowerCase())).slice(0, 6)
    : [];

  const showDropdown = open && suggestions.length > 0;

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(true);
  };

  // delay hiding so a tap on a suggestion registers before blur fires
  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const handleSelect = (city: string) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onChange(city);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={(t) => { onChange(t); setOpen(true); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="San Francisco"
        placeholderTextColor={colors.stone + "80"}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {showDropdown && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="always"
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  index < suggestions.length - 1 && styles.optionBorder,
                ]}
                activeOpacity={0.65}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 10,
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
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(93, 90, 87, 0.18)",
    overflow: "hidden",
    ...shadow.paper,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93, 90, 87, 0.10)",
  },
  optionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
});
