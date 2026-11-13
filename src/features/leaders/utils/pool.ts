import { useLeaderCategory } from '@/hooks';
import type { LeaderEntry } from '@/lib/espn';

/** Players checked: the top of the points, rebounds and assists leaders, so the list is about players who matter. */
const POOL_PER_CATEGORY = 12;

/** The leaders of the three main categories, each player once (loading while any of the three is). */
export function useLeaderPool(): { pool: LeaderEntry[]; pending: boolean } {
  const lists = [useLeaderCategory('ppg', POOL_PER_CATEGORY), useLeaderCategory('rpg', POOL_PER_CATEGORY), useLeaderCategory('apg', POOL_PER_CATEGORY)];
  const seen = new Set<string>();
  const pool: LeaderEntry[] = [];
  for (const { data } of lists) {
    for (const e of data ?? []) {
      if (e.athleteId && !seen.has(e.athleteId)) {
        seen.add(e.athleteId);
        pool.push(e);
      }
    }
  }
  return { pool, pending: lists.some((l) => l.isPending) };
}
