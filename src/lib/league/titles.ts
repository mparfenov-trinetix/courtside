import type { CareerRow } from '@/lib/espn';

/**
 * NBA champions by season (the year the season ends), as ESPN's team abbreviations. ESPN has no
 * "championships" count for a player, so titles are worked out from the seasons he spent on a champion.
 */
export const CHAMPIONS: Record<number, string> = {
  2000: 'LAL', 2001: 'LAL', 2002: 'LAL', 2003: 'SA', 2004: 'DET', 2005: 'SA', 2006: 'MIA', 2007: 'SA', 2008: 'BOS',
  2009: 'LAL', 2010: 'LAL', 2011: 'DAL', 2012: 'MIA', 2013: 'MIA', 2014: 'SA', 2015: 'GS', 2016: 'CLE', 2017: 'GS',
  2018: 'GS', 2019: 'TOR', 2020: 'LAL', 2021: 'MIL', 2022: 'GS', 2023: 'DEN', 2024: 'BOS', 2025: 'OKC', 2026: 'NY',
};

/**
 * NBA Cup winners by season (the year the season ends), as ESPN's abbreviations; the Cup began in 2023-24 as the In-Season
 * Tournament. Checked against the final's result on ESPN's scoreboard (2023-12-09, 2024-12-17, 2025-12-16).
 */
export const CUP_CHAMPIONS: Record<number, string> = { 2024: 'LAL', 2025: 'MIL', 2026: 'NY' };

/** Seasons in which the player was on the roster of the NBA Cup winner (the same rule as `titleSeasons`), newest first. */
export function cupSeasons(rows: Pick<CareerRow, 'year' | 'abbr'>[]): number[] {
  const years = new Set<number>();
  for (const r of rows) if (r.abbr !== 'TOT' && CUP_CHAMPIONS[r.year] === r.abbr) years.add(r.year);
  return [...years].sort((a, b) => b - a);
}

/**
 * Seasons in which the player was on the roster of the eventual champion, newest first. This counts anyone who
 * logged regular-season games for that team, so a player traded away before the playoffs still shows it.
 */
export function titleSeasons(rows: Pick<CareerRow, 'year' | 'abbr'>[]): number[] {
  const years = new Set<number>();
  for (const r of rows) if (r.abbr !== 'TOT' && CHAMPIONS[r.year] === r.abbr) years.add(r.year);
  return [...years].sort((a, b) => b - a);
}
