import { PlayoffsScreen } from '@/features/playoffs';

/** The playoff bracket opened from a game: a pushed page, so back returns to the game instead of the menu. */
export default function MatchupPlayoffs() {
  return <PlayoffsScreen pushed />;
}
