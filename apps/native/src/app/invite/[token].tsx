import { useLocalSearchParams } from "expo-router";
import ShareableProfileScreen from "../../screens/ShareableProfileScreen";

export default function InviteRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <ShareableProfileScreen token={token ?? ""} />;
}
