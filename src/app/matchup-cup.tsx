import { CupScreen } from '@/features/cup';

/** The NBA Cup opened from a game: a pushed page, so back returns to the game instead of the menu. */
export default function MatchupCup() {
  return <CupScreen pushed />;
}
