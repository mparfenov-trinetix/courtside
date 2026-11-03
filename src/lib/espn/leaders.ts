import { CORE, getJson, report } from './client';
import type { Json } from './client';
import { currentSeason } from './common';

export type LeaderEntry = {
  athleteId: string;
  name: string;
  shortName: string;
  teamId: string;   // ESPN team ID — component looks up abbr/color from useTeams()
  teamAbbr: string;
  teamColor: string;
  headshot?: string;
  value: number;
  displayValue: string;
};

export type LeagueLeaders = {
  ppg: LeaderEntry[];
  rpg: LeaderEntry[];
  apg: LeaderEntry[];
  stpg: LeaderEntry[];
  bpg: LeaderEntry[];
  mpg: LeaderEntry[];
  pfpg: LeaderEntry[];
};

export async function fetchLeagueLeaders(): Promise<LeagueLeaders> {
  const season = currentSeason();
  const json = await getJson(`${CORE}/seasons/${season}/types/2/leaders?limit=50&lang=en&region=us`);
  const cats: Json[] = json.categories ?? [];

  const CAT_NAMES = [
    'pointsPerGame', 'reboundsPerGame', 'assistsPerGame',
    'stealsPerGame', 'blocksPerGame', 'minutesPerGame', 'foulsPerGame',
  ] as const;

  type RawEntry = { ref: string; teamRef: string; value: number; displayValue: string };
  const rawByCategory: Record<string, RawEntry[]> = {};
  const allAthleteRefs = new Set<string>();

  for (const name of CAT_NAMES) {
    const cat = cats.find((c) => c.name === name);
    const leaders = ((cat?.leaders ?? []) as Json[]).slice(0, 50);
    rawByCategory[name] = leaders.map((l) => {
      const ref = String(l.athlete?.$ref ?? '').replace(/^http:\/\//, 'https://');
      const teamRef = String(l.team?.$ref ?? '');
      if (ref) allAthleteRefs.add(ref);
      return { ref, teamRef, value: l.value ?? 0, displayValue: l.displayValue ?? '' };
    });
  }

  // Resolve all athlete names in parallel (results cached for 1 h via TanStack Query)
  const athleteMap = new Map<string, { athleteId: string; name: string; shortName: string; headshot?: string }>();
  await Promise.all([...allAthleteRefs].map(async (ref) => {
    try {
      const data = await getJson(ref);
      const athleteId = String(data.id ?? '');
      athleteMap.set(ref, {
        athleteId,
        name: data.displayName ?? data.fullName ?? 'Unknown',
        shortName: data.shortName ?? data.displayName ?? '',
        headshot: data.headshot?.href ?? (athleteId ? `https://a.espncdn.com/i/headshots/nba/players/full/${athleteId}.png` : undefined),
      });
    } catch {
      const m = ref.match(/athletes\/(\d+)/);
      const athleteId = m?.[1] ?? '';
      athleteMap.set(ref, {
        athleteId,
        name: 'Unknown',
        shortName: '',
        headshot: athleteId ? `https://a.espncdn.com/i/headshots/nba/players/full/${athleteId}.png` : undefined,
      });
    }
  }));

  const buildEntries = (catName: string): LeaderEntry[] =>
    (rawByCategory[catName] ?? []).map(({ ref, teamRef, value, displayValue }) => {
      const athlete = athleteMap.get(ref);
      const teamIdMatch = teamRef.match(/teams\/(\d+)/);
      return {
        athleteId: athlete?.athleteId ?? '',
        name: athlete?.name ?? 'Unknown',
        shortName: athlete?.shortName ?? '',
        teamId: teamIdMatch?.[1] ?? '',
        teamAbbr: '',
        teamColor: '#1D428A',
        headshot: athlete?.headshot,
        value,
        displayValue,
      };
    });

  const leaders = {
    ppg: buildEntries('pointsPerGame'),
    rpg: buildEntries('reboundsPerGame'),
    apg: buildEntries('assistsPerGame'),
    stpg: buildEntries('stealsPerGame'),
    bpg: buildEntries('blocksPerGame'),
    mpg: buildEntries('minutesPerGame'),
    pfpg: buildEntries('foulsPerGame'),
  };
  // Early in a season there can be no qualifiers at all; only flag it when some categories fill and others don't.
  const sizes = Object.values(leaders).map((l) => l.length);
  report('leaders', Math.max(...sizes) > 0 && Math.min(...sizes) === 0 ? 'some leader categories are empty' : null);
  return leaders;
}
