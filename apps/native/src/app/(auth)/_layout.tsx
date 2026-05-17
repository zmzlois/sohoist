import { Redirect, Stack } from "expo-router";
import { useNativeAuth } from "../../auth";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useNativeAuth();

  if (!isLoaded) return null;

  if (isSignedIn) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
