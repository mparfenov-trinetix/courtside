import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import { lineToStats, sumPeriods, type QuarterStats } from './quarter-stats';

/** A team's players with stats for just the chosen periods (rebuilt from play-by-play), or the box score as-is. */
export function playersWithStats(
  team: BoxScoreTeam,
  derived: QuarterStats | null,
  periods: number[] | null,
): BoxScorePlayer[] {
  const all = [...team.starters, ...team.bench];
  if (!periods || !derived) return all;
  return all
    .map((player) => ({ player, line: sumPeriods(derived.players, periods, player.id) }))
    .filter(({ line }) => line.sec > 0)
    .map(({ player, line }) => ({ ...player, stats: lineToStats(line) }));
}
