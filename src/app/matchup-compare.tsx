import { CompareScreen } from '@/features/compare';

/** Compare opened from a player or team page: a pushed page, so back returns there instead of opening the menu. */
export default function MatchupCompare() {
  return <CompareScreen pushed />;
}
