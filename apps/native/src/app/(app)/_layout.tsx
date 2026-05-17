import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useNativeAuth } from "../../auth";

export default function AppLayout() {
  const { isLoaded, isSignedIn, user } = useNativeAuth();
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    if (!isSignedIn || !user) return;
    upsertUser({ email: user.email, name: user.name }).catch(console.error);
  }, [isSignedIn, user?.email, user?.name, upsertUser]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
