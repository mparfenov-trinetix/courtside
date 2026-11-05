import { BASE, getJson } from './client';
import { currentSeason } from './common';

/**
 * ESPN has no All-Star selections, only the All-Star MVP. The game itself is on the scoreboard though, so who played in
 * it says who was an All-Star. These are the game days (US Eastern) of each All-Star Game; a season is named by the year
 * it ends in, which is the February of the game. ESPN has no box scores before 2003.
 */
const GAME_DAYS: Record<number, string> = {
  2003: '0209', 2004: '0215', 2005: '0220', 2006: '0219', 2007: '0218', 2008: '0217', 2009: '0215', 2010: '0214',
  2011: '0220', 2012: '0226', 2013: '0217', 2014: '0216', 2015: '0215', 2016: '0214', 2017: '0219', 2018: '0218',
  2019: '0217', 2020: '0216', 2021: '0307', 2022: '0220', 2023: '0219', 2024: '0218', 2025: '0216', 2026: '0215',
};

/** The scoreboard day (YYYYMMDD, US Eastern) of a season's All-Star Game, when it is known. */
export const allStarGameKey = (season: number): string | null => (GAME_DAYS[season] ? `${season}${GAME_DAYS[season]}` : null);

/** Seasons each athlete played in an All-Star Game, newest first, keyed by athlete id. Never changes once read. */
export async function fetchAllStars(): Promise<Record<string, number[]>> {
  const seen = new Map<string, Set<number>>();
  const seasons = Object.keys(GAME_DAYS).map(Number).filter((y) => y <= currentSeason());
  await Promise.all(
    seasons.map(async (year) => {
      const board = await getJson(`${BASE}/scoreboard?dates=${year}${GAME_DAYS[year]}`);
      const ids: string[] = ((board.events ?? []) as { id: unknown }[]).map((e) => String(e.id));
      const games = await Promise.all(ids.map((id) => getJson(`${BASE}/summary?event=${id}`)));
      for (const game of games) {
        for (const team of (game.boxscore?.players ?? []) as { statistics?: { athletes?: { athlete?: { id?: unknown } }[] }[] }[]) {
          for (const a of team.statistics?.[0]?.athletes ?? []) {
            const id = String(a.athlete?.id ?? '');
            if (id) seen.set(id, (seen.get(id) ?? new Set()).add(year));
          }
        }
      }
    }),
  );
  return Object.fromEntries([...seen].map(([id, years]) => [id, [...years].sort((a, b) => b - a)]));
}
