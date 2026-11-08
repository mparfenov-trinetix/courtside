import { CORE, getJson, report } from './client';
import type { Json } from './client';
import { currentSeason } from './common';
import { headshotUrl } from './legend-photos';

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

/** The categories shown, keyed as the app names them, with ESPN's category name and how its value is read. */
export const LEADER_CATEGORIES = {
  ppg: { espn: 'pointsPerGame' },
  rpg: { espn: 'reboundsPerGame' },
  apg: { espn: 'assistsPerGame' },
  stpg: { espn: 'stealsPerGame' },
  bpg: { espn: 'blocksPerGame' },
  tpm: { espn: '3PointsMadePerGame' },
  // ESPN sends this one as a fraction (0.478) and its own display rounds it to "0.5": rescale and format here.
  tppct: { espn: '3PointPct', scale: 100 },
  fgpct: { espn: 'fieldGoalPercentage' },
  ftpct: { espn: 'FreeThrowPct' },
  topg: { espn: 'avgTurnovers' },
  dd: { espn: 'doubleDouble', digits: 0 },
  mpg: { espn: 'minutesPerGame' },
  pfpg: { espn: 'foulsPerGame' },
} as const satisfies Record<string, { espn: string; scale?: number; digits?: number }>;

export type LeaderCategory = keyof typeof LEADER_CATEGORIES;

/** A team's best player by ESPN's own rating, with his per-game points, rebounds and assists. */
export type TeamStar = { athleteId: string; name: string; shortName: string; headshot?: string; ppg: string; rpg: string; apg: string };

/**
 * The first entry of a team's `rating` leaders (ESPN's ranking of its best players): the athlete's record link and the per-game numbers
 * its display value carries ("23.4 PPG, 9.7 RPG, 9.3 APG, ..."). Null when the team has no rated player yet (the start of a season).
 */
export function normalizeTeamStar(json: Json): { ref: string; ppg: string; rpg: string; apg: string } | null {
  const lead: Json | undefined = ((json.categories ?? []) as Json[]).find((c) => c.name === 'rating')?.leaders?.[0];
  const ref = String(lead?.athlete?.$ref ?? '').replace(/^http:\/\//, 'https://');
  if (!lead || !ref) return null;
  const text = String(lead.displayValue ?? '');
  const part = (label: string) => new RegExp(`([\\d.]+)\\s*${label}`, 'i').exec(text)?.[1] ?? '';
  return { ref, ppg: part('PPG'), rpg: part('RPG'), apg: part('APG') };
}

type AthleteInfo = { athleteId: string; name: string; shortName: string; headshot?: string };

/** Athlete records already read, by ref: the same player leads several categories, and the screen reads them one at a time. */
const athletes = new Map<string, Promise<AthleteInfo>>();

function athleteOf(ref: string): Promise<AthleteInfo> {
  let known = athletes.get(ref);
  if (!known) {
    known = getJson(ref)
      .then((data): AthleteInfo => {
        const athleteId = String(data.id ?? '');
        return {
          athleteId,
          name: data.displayName ?? data.fullName ?? 'Unknown',
          shortName: data.shortName ?? data.displayName ?? '',
          headshot: data.headshot?.href ?? (athleteId ? headshotUrl(athleteId) : undefined),
        };
      })
      .catch((): AthleteInfo => {
        athletes.delete(ref);
        const athleteId = ref.match(/athletes\/(\d+)/)?.[1] ?? '';
        return { athleteId, name: 'Unknown', shortName: '', headshot: athleteId ? headshotUrl(athleteId) : undefined };
      });
    athletes.set(ref, known);
  }
  return known;
}

/** The best player of one team this season, or null before ESPN has rated anyone. */
export async function fetchTeamStar(teamId: string): Promise<TeamStar | null> {
  const json = await getJson(`${CORE}/seasons/${currentSeason()}/types/2/teams/${teamId}/leaders?lang=en&region=us`);
  const star = normalizeTeamStar(json);
  if (!star) return null;
  const who = await athleteOf(star.ref);
  return { ...who, ppg: star.ppg, rpg: star.rpg, apg: star.apg };
}

/**
 * One category's leaders (the top `limit`). Each category is read on its own, when its tab is opened: reading all fourteen at once
 * meant about 230 athlete requests before the screen showed anything. The one list request carries every category, so asking
 * again for another costs a single request; athletes already read are not asked for twice.
 */
export async function fetchLeaderCategory(key: LeaderCategory, limit = 50): Promise<LeaderEntry[]> {
  const json = await getJson(`${CORE}/seasons/${currentSeason()}/types/2/leaders?limit=50&lang=en&region=us`);
  const cats: Json[] = json.categories ?? [];
  const { espn, ...fmt } = LEADER_CATEGORIES[key];
  const scale = 'scale' in fmt ? fmt.scale : 1;
  const digits = 'digits' in fmt ? fmt.digits : 1;
  const raw = (((cats.find((c) => c.name === espn)?.leaders ?? []) as Json[]).slice(0, limit)).map((l) => ({
    ref: String(l.athlete?.$ref ?? '').replace(/^http:\/\//, 'https://'),
    teamRef: String(l.team?.$ref ?? ''),
    value: (l.value ?? 0) as number,
    displayValue: (l.displayValue ?? '') as string,
  }));
  const people = await Promise.all(raw.map((r) => (r.ref ? athleteOf(r.ref) : Promise.resolve<AthleteInfo>({ athleteId: '', name: 'Unknown', shortName: '' }))));
  const entries = raw.map(({ teamRef, value, displayValue }, i): LeaderEntry => {
    const v = value * scale;
    return {
      athleteId: people[i].athleteId,
      name: people[i].name,
      shortName: people[i].shortName,
      teamId: teamRef.match(/teams\/(\d+)/)?.[1] ?? '',
      teamAbbr: '',
      teamColor: '#1D428A',
      headshot: people[i].headshot,
      value: v,
      displayValue: scale === 1 && digits === 1 ? displayValue : v.toFixed(digits),
    };
  });
  // Early in a season there can be no qualifiers at all.
  report('leaders', cats.length > 0 && entries.length === 0 && key === 'ppg' ? 'the points leaders are empty' : null);
  return entries;
}
