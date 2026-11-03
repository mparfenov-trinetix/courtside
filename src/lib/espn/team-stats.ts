import { getJson, report } from './client';
import type { Json } from './client';
import { currentSeason } from './common';

/** One team's season numbers (per game unless noted). `opp*` are what opponents did against them. */
export type TeamStatRow = {
  teamId: string;
  abbr: string;
  name: string;
  gp: number;
  ppg: number;
  oppPpg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  tov: number;
  fgPct: number;
  threePct: number;
  ftPct: number;
  efgPct: number;
  oppFgPct: number;
  /** Average margin: points scored minus points allowed. */
  diff: number;
};

/**
 * All 30 teams in one call (the same feed ESPN's team-stats page uses). Ranks are computed
 * from this table in `src/lib/team-stats.ts`: ESPN's own per-team `rank` fields are inconsistent
 * for derived stats such as 3-point %.
 */
export async function fetchLeagueTeamStats(): Promise<TeamStatRow[]> {
  const rows = normalizeLeagueTeamStats(
    await getJson(
      `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byteam` +
        `?region=us&lang=en&contentorigin=espn&season=${currentSeason()}&seasontype=2`,
    ),
  );
  const played = rows.filter((r) => r.gp > 0);
  report('team stats', rows.length < 25 || (played.length > 0 && played.every((r) => r.ppg === 0)) ? 'team stats table looks empty' : null);
  return rows;
}

export function normalizeLeagueTeamStats(json: Json): TeamStatRow[] {
  // Stat names are listed once per category group; each team then has an "Own" and an "Opponent" split.
  const names: Record<string, string[]> = {};
  for (const c of json.categories ?? []) if (Array.isArray(c.names)) names[c.name] = c.names;

  return (json.teams ?? []).map((t: Json): TeamStatRow => {
    const pick = (group: string, split: 'own' | 'opp', stat: string): number => {
      const cats: Json[] = (t.categories ?? []).filter((c: Json) => c.name === group);
      const cat = cats[split === 'own' ? 0 : 1];
      const idx = (names[group] ?? []).indexOf(stat);
      const v = idx >= 0 ? Number(cat?.values?.[idx]) : NaN;
      return isNaN(v) ? 0 : v;
    };
    const fgm = pick('offensive', 'own', 'avgFieldGoalsMade');
    const fga = pick('offensive', 'own', 'avgFieldGoalsAttempted');
    const tpm = pick('offensive', 'own', 'avgThreePointFieldGoalsMade');
    return {
      teamId: String(t.team?.id),
      abbr: t.team?.abbreviation ?? '',
      name: t.team?.displayName ?? '',
      gp: pick('general', 'own', 'gamesPlayed'),
      ppg: pick('offensive', 'own', 'avgPoints'),
      oppPpg: pick('offensive', 'opp', 'avgPoints'),
      rpg: pick('general', 'own', 'avgRebounds'),
      apg: pick('offensive', 'own', 'avgAssists'),
      spg: pick('defensive', 'own', 'avgSteals'),
      bpg: pick('defensive', 'own', 'avgBlocks'),
      tov: pick('offensive', 'own', 'avgTurnovers'),
      fgPct: pick('offensive', 'own', 'fieldGoalPct'),
      threePct: pick('offensive', 'own', 'threePointFieldGoalPct'),
      ftPct: pick('offensive', 'own', 'freeThrowPct'),
      efgPct: fga > 0 ? ((fgm + 0.5 * tpm) / fga) * 100 : 0,
      oppFgPct: pick('offensive', 'opp', 'fieldGoalPct'),
      diff: pick('offensive', 'own', 'avgPoints') - pick('offensive', 'opp', 'avgPoints'),
    };
  });
}
