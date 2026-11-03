import { useLocalSearchParams } from 'expo-router';

import { TeamHome } from '@/components/team-home';

/** Any team's card, pushed on top of the current screen (back arrow and swipe-back return to it). */
export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TeamHome teamId={id} pushed />;
}
