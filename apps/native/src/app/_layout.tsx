import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import { Platform, StatusBar, View } from "react-native";
import ConvexClientProvider from "../../ConvexClientProvider";
import { nativeFonts } from "@packages/ui/assets/native";
import { NativeAuthProvider } from "../auth";

const statusBarHeight =
  Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 0);

export default function RootLayout() {
  const pathname = usePathname();
  const [loaded] = useFonts({
    /* inter — ui / body */
    Bold: nativeFonts.interBold,
    SemiBold: nativeFonts.interSemiBold,
    Medium: nativeFonts.interMedium,
    Regular: nativeFonts.interRegular,
    /* montserrat — kept for any legacy screens */
    MBold: require("../assets/fonts/Montserrat-Bold.ttf"),
    MSemiBold: require("../assets/fonts/Montserrat-SemiBold.ttf"),
    MMedium: require("../assets/fonts/Montserrat-Medium.ttf"),
    MRegular: require("../assets/fonts/Montserrat-Regular.ttf"),
    MLight: require("../assets/fonts/Montserrat-Light.ttf"),
    /* cormorant — shared brand display fonts */
    "Cormorant-Regular": nativeFonts.cormorantRegular,
    "Cormorant-Italic": nativeFonts.cormorantItalic,
    "Cormorant-Medium": nativeFonts.cormorantMedium,
    "Cormorant-MediumItalic": nativeFonts.cormorantMediumItalic,
    "Cormorant-SemiBold": nativeFonts.cormorantSemiBold,
  });

  if (!loaded) return null;

  const isSignInRoute = pathname === "/sign-in";
  const statusBackground = isSignInRoute ? "transparent" : "#F5EFE6";

  return (
    <NativeAuthProvider>
      <ConvexClientProvider>
        <View style={{ flex: 1 }}>
          <View
            style={{
              height: isSignInRoute ? 0 : statusBarHeight,
              backgroundColor: statusBackground,
            }}
          >
            <StatusBar
              translucent
              backgroundColor={statusBackground}
              barStyle={isSignInRoute ? "light-content" : "dark-content"}
            />
          </View>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </ConvexClientProvider>
    </NativeAuthProvider>
  );
}
