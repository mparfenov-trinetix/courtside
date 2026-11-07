import type { PlayerSeasonStats } from '@/lib/espn';

const num = (v: string | undefined) => {
  const n = parseFloat(v ?? '');
  return Number.isNaN(n) ? undefined : n;
};

/**
 * The career line of the stats table (ESPN's column labels) as the averages the player card shows: what a retired player's card
 * has instead of a season line. Null when the line holds none of them.
 */
export function careerAverages(line: Record<string, string>): PlayerSeasonStats | null {
  const stats: PlayerSeasonStats = {
    ppg: num(line.PTS),
    rpg: num(line.REB),
    apg: num(line.AST),
    spg: num(line.STL),
    bpg: num(line.BLK),
    mpg: num(line.MIN),
  };
  return Object.values(stats).some((v) => v != null) ? stats : null;
}
