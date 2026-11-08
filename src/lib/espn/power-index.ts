import { CORE, getJson, type Json } from './client';
import { currentSeason } from './common';

/**
 * ESPN's Basketball Power Index: a rating of each team's true strength as the points it would beat an average team by on a neutral
 * court (`bpi`), split into an offensive and a defensive part, with ESPN's own projection of the rest of the season (wins, the
 * playoffs, the Finals, the title). The chances are percentages (20.4 = 20.4%).
 */
export type PowerRow = {
  teamId: string;
  /** Points of margin against an average team: +8.7 is a very good team, -6 a very bad one. */
  bpi: number;
  rank: number;
  offense: number;
  defense: number;
  wins: number;
  losses: number;
  projWins: number;
  projLosses: number;
  /** Chances, in percent. */
  playoffs: number;
  finals: number;
  title: number;
};

/** Pure: the teams ranked by ESPN's own order (rank 1 first), from the `powerindex` response. */
export function normalizePowerIndex(json: Json): PowerRow[] {
  return ((json.items ?? []) as Json[])
    .flatMap((item): PowerRow[] => {
      const teamId = /\/teams\/(\d+)/.exec(String(item.team?.$ref ?? ''))?.[1];
      if (!teamId) return [];
      const stat = (name: string) => {
        const s = ((item.stats ?? []) as Json[]).find((x) => x.name === name);
        const n = Number(s?.value);
        return Number.isFinite(n) ? n : 0;
      };
      return [
        {
          teamId,
          bpi: stat('bpi'),
          rank: stat('rank') || stat('bpirank'),
          offense: stat('bpioffense'),
          defense: stat('bpidefense'),
          wins: stat('numwins'),
          losses: stat('numlosses'),
          projWins: stat('projectedw'),
          projLosses: stat('projectedl'),
          playoffs: stat('probmakeplayoffs'),
          finals: stat('probmaketitlegame'),
          title: stat('probwintitle'),
        },
      ];
    })
    .sort((a, b) => a.rank - b.rank);
}

export async function fetchPowerIndex(season: number = currentSeason()): Promise<PowerRow[]> {
  return normalizePowerIndex(await getJson(`${CORE}/seasons/${season}/powerindex?lang=en&region=us&limit=30`));
}
