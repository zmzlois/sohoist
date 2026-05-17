import { useLocalSearchParams } from "expo-router";
import CandidateIntroScreen from "../../screens/CandidateIntroScreen";

export default function CandidateIntroRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <CandidateIntroScreen token={token ?? ""} />;
}
