import { useLocalSearchParams } from 'expo-router';

import { currentSeason } from '@/lib/espn';
import { TeamHome, TeamSeasonHome } from '../../components';

/**
 * Any team's card, pushed on top of the current screen (back arrow and swipe-back return to it). With a `season` in the past (a game, the
 * standings, the champion card or the team page's "Past seasons" opened it) it is the team's card in that season instead.
 */
export function TeamScreen() {
  const { id, o, season } = useLocalSearchParams<{ id: string; o?: string; season?: string }>();
  const year = season ? Number(season) : undefined;
  if (year && year < currentSeason()) return <TeamSeasonHome teamId={id} season={year} />;
  return <TeamHome teamId={id} pushed origin={o} />;
}
