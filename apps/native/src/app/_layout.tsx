import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { Platform, StatusBar, View } from "react-native";
import ConvexClientProvider from "../../ConvexClientProvider";
import { NativeAuthProvider } from "../auth";

const statusBarHeight =
  Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 0);

export default function RootLayout() {
  const [loaded] = useFonts({
    /* inter — ui / body */
    Bold: require("../assets/fonts/Inter-Bold.ttf"),
    SemiBold: require("../assets/fonts/Inter-SemiBold.ttf"),
    Medium: require("../assets/fonts/Inter-Medium.ttf"),
    Regular: require("../assets/fonts/Inter-Regular.ttf"),
    /* montserrat — kept for any legacy screens */
    MBold: require("../assets/fonts/Montserrat-Bold.ttf"),
    MSemiBold: require("../assets/fonts/Montserrat-SemiBold.ttf"),
    MMedium: require("../assets/fonts/Montserrat-Medium.ttf"),
    MRegular: require("../assets/fonts/Montserrat-Regular.ttf"),
    MLight: require("../assets/fonts/Montserrat-Light.ttf"),
    /* cormorant — local files from packages/assets/fonts */
    "Cormorant-Regular": require("../assets/fonts/Cormorant-Regular.ttf"),
    "Cormorant-Italic": require("../assets/fonts/Cormorant-Italic.ttf"),
    "Cormorant-Medium": require("../assets/fonts/Cormorant-Medium.ttf"),
    "Cormorant-MediumItalic": require("../assets/fonts/Cormorant-MediumItalic.ttf"),
    "Cormorant-SemiBold": require("../assets/fonts/Cormorant-SemiBold.ttf"),
  });

  if (!loaded) return null;

  return (
    <NativeAuthProvider>
      <ConvexClientProvider>
        <View style={{ flex: 1 }}>
          <View style={{ height: statusBarHeight, backgroundColor: "#F5EFE6" }}>
            <StatusBar
              translucent
              backgroundColor="#F5EFE6"
              barStyle="dark-content"
            />
          </View>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </ConvexClientProvider>
    </NativeAuthProvider>
  );
}
