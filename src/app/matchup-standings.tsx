import { StandingsScreen } from '@/features/standings';

/** The standings opened from a game: a pushed page, so back returns to the game instead of the menu. */
export default function MatchupStandings() {
  return <StandingsScreen pushed />;
}
