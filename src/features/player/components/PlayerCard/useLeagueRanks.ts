import { useLeaderCategory } from '@/hooks';
import { CARD_STATS, RANK_SHOWN } from './constants';

export type CardRanks = Partial<Record<(typeof CARD_STATS)[number]['key'], number>>;

/**
 * Where he stands in the league for each of the card's stats, from the top-50 leaders feeds (the same cached queries the League
 * Leaders screen reads, kept for an hour). Anyone outside a top 50 simply has no rank for that stat. Reads nothing until `enabled`.
 */
export function useLeagueRanks(athleteId: string | undefined, enabled: boolean): CardRanks {
  // One query per category, always the same five in the same order.
  const queries = [
    useLeaderCategory('ppg', 50, enabled),
    useLeaderCategory('rpg', 50, enabled),
    useLeaderCategory('apg', 50, enabled),
    useLeaderCategory('stpg', 50, enabled),
    useLeaderCategory('bpg', 50, enabled),
  ];
  const ranks: CardRanks = {};
  if (!athleteId) return ranks;
  CARD_STATS.forEach((stat, i) => {
    const at = queries[i].data?.findIndex((e) => e.athleteId === athleteId) ?? -1;
    if (at >= 0 && at < RANK_SHOWN) ranks[stat.key] = at + 1;
  });
  return ranks;
}
