import { useMemo } from 'react';

import { usePostseason } from '@/hooks';
import { buildPlayoffs, seedMap, type Series } from '@/lib/league';

/**
 * One playoff series, found again by its id in the season's bracket (the same cached query the Playoffs screen reads, so it is there at once
 * and moves with it while a game is on): a route can only carry a few words, not a series with its games. The play-in and the Cup's knockout
 * are single games, not series: their cards open the game itself.
 */
export function useSeries(season: number, id: string): { series?: Series; isPending: boolean; error?: Error; refetch: () => void } {
  const post = usePostseason(season);
  const series = useMemo(() => {
    if (!post.data) return undefined;
    return buildPlayoffs(post.data.playoffs, seedMap(post.data.standings)).rounds.flatMap((r) => r.series).find((s) => s.id === id);
  }, [id, post.data]);
  return { series, isPending: post.isPending, error: post.error ?? undefined, refetch: () => void post.refetch() };
}
