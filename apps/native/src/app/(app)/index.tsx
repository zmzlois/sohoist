import { Redirect } from "expo-router";
import { useQuery } from "convex/react";
import { View, ActivityIndicator } from "react-native";
import { api } from "@packages/backend/convex/_generated/api";
import { colors } from "../../theme";
import { useNativeAuth } from "../../auth";

export default function AppIndex() {
  const { user } = useNativeAuth();
  const application = useQuery(
    api.applications.getMyApplication,
    user?.email ? { email: user.email } : "skip",
  );

  // loading — convex hasn't resolved yet
  if (application === undefined) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.stone} />
      </View>
    );
  }

  if (!application) return <Redirect href="/apply" />;
  if (application.status === "approved") return <Redirect href="/home" />;
  return <Redirect href="/pending" />;
}
