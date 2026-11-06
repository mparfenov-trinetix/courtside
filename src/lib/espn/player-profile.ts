import { CORE, getJson } from './client';
import type { Json } from './client';
import { currentSeason } from './common';

export type Honor = { id: string; name: string; count: number; seasons: number[] };

export type Contract = {
  season: number;
  salary: number;
  yearsRemaining: number;
  /** ESPN's option code: 0 means none. */
  option: number;
  tradeRestriction: boolean;
  tradeKicker: boolean;
  minimumException: boolean;
};

export type Draft = { year: number; round: number; pick: number };

export type PlayerProfile = { honors: Honor[]; contract?: Contract; draft?: Draft };

const CORE_ATHLETE = (id: string) => `${CORE}/athletes/${id}`;

/**
 * Honors (MVP, All-NBA, All-Defensive... already counted by ESPN), the current contract and the draft slot.
 * Each part is independent: a missing contract (retired player, no data) doesn't lose the honors.
 */
export async function fetchPlayerProfile(athleteId: string): Promise<PlayerProfile> {
  const season = currentSeason();
  const [overview, contract, athlete] = await Promise.allSettled([
    getJson(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}/overview`),
    // The newest contract record: this season's, else last season's (offseason, before the new one is filed).
    getJson(`${CORE_ATHLETE(athleteId)}/contracts/${season}?lang=en&region=us`).catch(() =>
      getJson(`${CORE_ATHLETE(athleteId)}/contracts/${season - 1}?lang=en&region=us`),
    ),
    getJson(`${CORE_ATHLETE(athleteId)}?lang=en&region=us`),
  ]);

  const honors: Honor[] =
    overview.status === 'fulfilled'
      ? ((overview.value.awards ?? []) as Json[]).map((a) => {
          const seasons = ((a.seasons ?? []) as string[]).map(Number).filter((n) => !isNaN(n)).sort((x, y) => y - x);
          return { id: String(a.id), name: String(a.name ?? ''), count: seasons.length || parseInt(String(a.displayCount), 10) || 1, seasons };
        })
      : [];

  // A contract belongs to someone on a team right now: a retired player has none, and a free agent would otherwise show last season's.
  const employed = athlete.status === 'fulfilled' && athlete.value.active === true && !!athlete.value.team;
  let parsed: Contract | undefined;
  if (employed && contract.status === 'fulfilled' && typeof contract.value.salary === 'number' && contract.value.active !== false) {
    const c = contract.value;
    const m = /seasons\/(\d{4})/.exec(String(c.season?.$ref ?? c.$ref ?? ''));
    parsed = {
      season: m ? Number(m[1]) : season,
      salary: c.salary,
      yearsRemaining: Number(c.yearsRemaining ?? 0),
      option: Number(c.optionType ?? 0),
      tradeRestriction: c.tradeRestriction === true,
      tradeKicker: c.tradeKicker?.active === true,
      minimumException: c.minimumSalaryException === true,
    };
  }

  let draft: Draft | undefined;
  if (athlete.status === 'fulfilled') {
    const d = athlete.value.draft;
    if (d && typeof d.year === 'number' && d.round > 0) draft = { year: d.year, round: d.round, pick: Number(d.selection ?? 0) };
  }

  return { honors, contract: parsed, draft };
}
