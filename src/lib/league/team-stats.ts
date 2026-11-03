import type { TeamStatRow } from '@/lib/espn';

export type TeamMetric = {
  key: Exclude<keyof TeamStatRow, 'teamId' | 'abbr' | 'name' | 'gp'>;
  label: string;
  short: string;
  decimals: number;
  pct?: boolean;
  /** Show a leading + for positive values. */
  signed?: boolean;
  /** Lower is better (turnovers, points allowed): rank 1 is the smallest value. */
  lowerBetter?: boolean;
};

export const TEAM_METRICS: TeamMetric[] = [
  { key: 'diff', label: 'Point differential', short: 'DIFF', decimals: 1, signed: true },
  { key: 'ppg', label: 'Points', short: 'PPG', decimals: 1 },
  { key: 'oppPpg', label: 'Points allowed', short: 'OPP', decimals: 1, lowerBetter: true },
  { key: 'rpg', label: 'Rebounds', short: 'RPG', decimals: 1 },
  { key: 'apg', label: 'Assists', short: 'APG', decimals: 1 },
  { key: 'spg', label: 'Steals', short: 'SPG', decimals: 1 },
  { key: 'bpg', label: 'Blocks', short: 'BPG', decimals: 1 },
  { key: 'tov', label: 'Turnovers', short: 'TOV', decimals: 1, lowerBetter: true },
  { key: 'fgPct', label: 'Field goal %', short: 'FG%', decimals: 1, pct: true },
  { key: 'threePct', label: '3-point %', short: '3P%', decimals: 1, pct: true },
  { key: 'ftPct', label: 'Free throw %', short: 'FT%', decimals: 1, pct: true },
  { key: 'efgPct', label: 'Effective FG %', short: 'eFG%', decimals: 1, pct: true },
  { key: 'oppFgPct', label: 'Opp. FG %', short: 'OFG%', decimals: 1, pct: true, lowerBetter: true },
];

export const metricByKey = (key: TeamMetric['key']) => TEAM_METRICS.find((m) => m.key === key)!;

/** 1-based league rank of a team for a metric, with ties sharing the better rank. */
export function rankOf(rows: TeamStatRow[], teamId: string, metric: TeamMetric): number | undefined {
  const mine = rows.find((r) => r.teamId === teamId);
  if (!mine) return undefined;
  const v = mine[metric.key];
  return 1 + rows.filter((r) => (metric.lowerBetter ? r[metric.key] < v : r[metric.key] > v)).length;
}

export const formatMetric = (m: TeamMetric, v: number) =>
  (m.signed && v > 0 ? '+' : '') + v.toFixed(m.decimals) + (m.pct ? '%' : '');

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
