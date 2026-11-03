import type { TeamMetric } from '@/lib/league';

export const TAB_LABEL: Partial<Record<TeamMetric['key'], string>> = { oppPpg: 'Opp PPG', oppFgPct: 'Opp FG%' };

export const FULL: Record<TeamMetric['key'], string> = {
  diff: 'Point differential, per game',
  ppg: 'Points per game',
  oppPpg: 'Points allowed per game · fewest first',
  rpg: 'Rebounds per game',
  apg: 'Assists per game',
  spg: 'Steals per game',
  bpg: 'Blocks per game',
  tov: 'Turnovers per game · fewest first',
  fgPct: 'Field goal percentage',
  threePct: '3-point percentage',
  ftPct: 'Free throw percentage',
  efgPct: 'Effective field goal percentage',
  oppFgPct: 'Opponent field goal % · lowest first',
};
