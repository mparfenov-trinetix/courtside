import { useLocalSearchParams } from 'expo-router';

import { TeamHome } from '../../components';

/** Any team's card, pushed on top of the current screen (back arrow and swipe-back return to it). */
export function TeamScreen() {
  const { id, o } = useLocalSearchParams<{ id: string; o?: string }>();
  return <TeamHome teamId={id} pushed origin={o} />;
}
