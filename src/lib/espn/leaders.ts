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
  /** Percentage categories: how many he makes a game ("1.1" threes at 58%), from his season record. */
  made?: string;
  /** ESPN's position abbreviation ("G", "PF", "C") and his height as ESPN prints it (6' 7"), from his athlete record. */
  position?: string;
  height?: string;
};

/** The categories shown, keyed as the app names them, with ESPN's category name and how its value is read. */
export const LEADER_CATEGORIES = {
  ppg: { espn: 'pointsPerGame' },
  rpg: { espn: 'reboundsPerGame' },
  apg: { espn: 'assistsPerGame' },
  stpg: { espn: 'stealsPerGame' },
  bpg: { espn: 'blocksPerGame' },
  tpm: { espn: '3PointsMadePerGame' },
  // ESPN sends this one as a fraction (0.478) and its own display rounds it to "0.5": rescale and format here. The percentages are
  // shown whole ("58%") with what he makes a game beside them ("(1.1)"), read from his season record (`made`).
  tppct: { espn: '3PointPct', scale: 100, digits: 0, percent: true, made: 'avgThreePointFieldGoalsMade' },
  fgpct: { espn: 'fieldGoalPercentage', digits: 0, percent: true, made: 'avgFieldGoalsMade' },
  ftpct: { espn: 'FreeThrowPct', digits: 0, percent: true, made: 'avgFreeThrowsMade' },
  topg: { espn: 'avgTurnovers' },
  dd: { espn: 'doubleDouble', digits: 0 },
  // Minutes are a clock, not a decimal: 37.36 is 37:22 (ESPN's own display, "37.4", is a rounded decimal).
  mpg: { espn: 'minutesPerGame', clock: true },
  pfpg: { espn: 'foulsPerGame' },
  // Ranked by a number ESPN has no leaders list for, read from each player's season record: the players are the top fifty of `espn`'s list (the
  // rebounders for the two kinds of rebound, the scorers for the rest), so these are the best of those fifty, not of the whole league.
  // `per` divides by another stat of the record (the season's plus-minus is a total: per game it is comparable).
  orpg: { espn: 'reboundsPerGame', stat: 'avgOffensiveRebounds' },
  drpg: { espn: 'reboundsPerGame', stat: 'avgDefensiveRebounds' },
  per: { espn: 'pointsPerGame', stat: 'PER' },
  pm: { espn: 'pointsPerGame', stat: 'plusMinus', per: 'gamesPlayed', signed: true },
} as const satisfies Record<string, { espn: string; scale?: number; digits?: number; percent?: boolean; made?: string; clock?: boolean; stat?: string; per?: string; signed?: boolean }>;

export type LeaderCategory = keyof typeof LEADER_CATEGORIES;

/** A team's best player by ESPN's own rating, with his per-game points, rebounds and assists. */
export type TeamStar = { athleteId: string; name: string; shortName: string; headshot?: string; ppg: string; rpg: string; apg: string; /** ESPN's position abbreviation ("G", "PG", "F", "C"...) and his number. */ position?: string; jersey?: string };

/**
 * A team's `rating` leaders (ESPN's ranking of its players, the whole roster, best first): each athlete's record link and the per-game numbers
 * its display value carries ("23.4 PPG, 9.7 RPG, 9.3 APG, ..."). Empty when the team has no rated player yet (the start of a season).
 */
function normalizeTeamLeaders(json: Json, limit = 8): { ref: string; ppg: string; rpg: string; apg: string }[] {
  const leaders: Json[] = ((json.categories ?? []) as Json[]).find((c) => c.name === 'rating')?.leaders ?? [];
  return leaders.slice(0, limit).flatMap((lead) => {
    const ref = String(lead?.athlete?.$ref ?? '').replace(/^http:\/\//, 'https://');
    if (!ref) return [];
    const text = String(lead.displayValue ?? '');
    const part = (label: string) => new RegExp(`([\\d.]+)\\s*${label}`, 'i').exec(text)?.[1] ?? '';
    return [{ ref, ppg: part('PPG'), rpg: part('RPG'), apg: part('APG') }];
  });
}

/** The first of them: the team's best player. Null when nobody is rated yet. */
export const normalizeTeamStar = (json: Json) => normalizeTeamLeaders(json, 1)[0] ?? null;

type AthleteInfo = { athleteId: string; name: string; shortName: string; headshot?: string; position?: string; jersey?: string; height?: string };

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
          position: data.position?.abbreviation ? String(data.position.abbreviation) : undefined,
          jersey: data.jersey ? String(data.jersey) : undefined,
          height: data.displayHeight ? String(data.displayHeight) : undefined,
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
export async function fetchTeamStar(teamId: string, season: number = currentSeason()): Promise<TeamStar | null> {
  const json = await getJson(`${CORE}/seasons/${season}/types/2/teams/${teamId}/leaders?lang=en&region=us`);
  const star = normalizeTeamStar(json);
  if (!star) return null;
  const who = await athleteOf(star.ref);
  return { ...who, ppg: star.ppg, rpg: star.rpg, apg: star.apg };
}

/**
 * A team's best rated players, best first (`limit` of them): each with his points, rebounds and assists, and, for those `wanted` says yes to
 * (a star's line), his name, position and number (one athlete record each). The rest are only places in the ranking, with no record read: a
 * key matchup needs stars, so for most teams this is one request and a few records instead of the whole top of the roster.
 */
export async function fetchTeamRated(teamId: string, limit = 6, wanted: (line: { ppg: string; rpg: string; apg: string }) => boolean = () => true): Promise<TeamStar[]> {
  const json = await getJson(`${CORE}/seasons/${currentSeason()}/types/2/teams/${teamId}/leaders?lang=en&region=us`);
  const rated = normalizeTeamLeaders(json, limit);
  return Promise.all(
    rated.map(async (r): Promise<TeamStar> => {
      const stats = { ppg: r.ppg, rpg: r.rpg, apg: r.apg };
      if (!wanted(stats)) return { athleteId: r.ref.match(/athletes\/(\d+)/)?.[1] ?? '', name: '', shortName: '', ...stats };
      return { ...(await athleteOf(r.ref)), ...stats };
    }),
  );
}

/** Minutes as a clock: 37.3636 -> "37:22". */
export function minutesClock(minutes: number): string {
  const total = Math.round(minutes * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** One named number out of an athlete's statistics record (`splits.categories[].stats[]`), or undefined when it is not there. */
export function statByName(json: Json, name: string): number | undefined {
  for (const category of (json.splits?.categories ?? []) as Json[]) {
    const stat = ((category.stats ?? []) as Json[]).find((s) => s.name === name);
    if (stat && typeof stat.value === 'number') return stat.value;
  }
  return undefined;
}

/** Statistics records already read, by ref: the three percentage tabs share the same fifty or so players. */
const records = new Map<string, Promise<Json | null>>();

function recordOf(ref: string): Promise<Json | null> {
  let known = records.get(ref);
  if (!known) {
    known = getJson(ref).catch(() => {
      records.delete(ref);
      return null;
    });
    records.set(ref, known);
  }
  return known;
}

/**
 * The categories ranked by a number in each player's season record: the top fifty of ESPN's list `espn` names, each one's record read (one small
 * request each, read once per player and shared with the percentage tabs), the stat taken (divided by `per` when there is one) and the players
 * sorted by it. A player whose record lacks the stat is left out.
 */
async function fetchStatCategory(
  cats: Json[],
  espn: string,
  fmt: { stat: string; per?: string; signed?: boolean; digits?: number },
  limit: number,
): Promise<LeaderEntry[]> {
  const raw = ((cats.find((c) => c.name === espn)?.leaders ?? []) as Json[]).slice(0, 50).map((l) => ({
    ref: String(l.athlete?.$ref ?? '').replace(/^http:\/\//, 'https://'),
    teamRef: String(l.team?.$ref ?? ''),
    statsRef: String(l.statistics?.$ref ?? '').replace(/^http:\/\//, 'https://'),
  }));
  const [people, recs] = await Promise.all([
    Promise.all(raw.map((r) => (r.ref ? athleteOf(r.ref) : Promise.resolve<AthleteInfo>({ athleteId: '', name: 'Unknown', shortName: '' })))),
    Promise.all(raw.map((r) => (r.statsRef ? recordOf(r.statsRef) : Promise.resolve(null)))),
  ]);
  const digits = fmt.digits ?? 1;
  const entries = raw.flatMap(({ teamRef }, i): LeaderEntry[] => {
    const rec = recs[i];
    let value = rec ? statByName(rec, fmt.stat) : undefined;
    if (value !== undefined && fmt.per) {
      const divisor = rec ? statByName(rec, fmt.per) : undefined;
      value = divisor ? value / divisor : undefined;
    }
    if (value === undefined) return [];
    return [
      {
        athleteId: people[i].athleteId,
        name: people[i].name,
        shortName: people[i].shortName,
        teamId: teamRef.match(/teams\/(\d+)/)?.[1] ?? '',
        teamAbbr: '',
        teamColor: '#1D428A',
        headshot: people[i].headshot,
        position: people[i].position,
        height: people[i].height,
        value,
        displayValue: (fmt.signed && value > 0 ? '+' : '') + value.toFixed(digits),
      },
    ];
  });
  return entries.sort((a, b) => b.value - a.value).slice(0, limit);
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
  if ('stat' in fmt) return fetchStatCategory(cats, espn, fmt, limit);
  const scale = 'scale' in fmt ? fmt.scale : 1;
  const digits = 'digits' in fmt ? fmt.digits : 1;
  const raw = (((cats.find((c) => c.name === espn)?.leaders ?? []) as Json[]).slice(0, limit)).map((l) => ({
    ref: String(l.athlete?.$ref ?? '').replace(/^http:\/\//, 'https://'),
    teamRef: String(l.team?.$ref ?? ''),
    statsRef: String(l.statistics?.$ref ?? '').replace(/^http:\/\//, 'https://'),
    value: (l.value ?? 0) as number,
    displayValue: (l.displayValue ?? '') as string,
  }));
  const people = await Promise.all(raw.map((r) => (r.ref ? athleteOf(r.ref) : Promise.resolve<AthleteInfo>({ athleteId: '', name: 'Unknown', shortName: '' }))));
  // The percentage tabs carry what he makes a game: one record each, all at once (about fifty small requests, read once per player).
  const madeStat = 'made' in fmt ? fmt.made : undefined;
  const made = madeStat
    ? await Promise.all(raw.map(async (r) => (r.statsRef ? statByName((await recordOf(r.statsRef)) ?? {}, madeStat) : undefined)))
    : [];
  const percent = 'percent' in fmt && fmt.percent;
  const clock = 'clock' in fmt && fmt.clock;
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
      position: people[i].position,
      height: people[i].height,
      value: v,
      displayValue: clock ? minutesClock(v) : (scale === 1 && digits === 1 ? displayValue : v.toFixed(digits)) + (percent ? '%' : ''),
      made: made[i] != null ? made[i]!.toFixed(1) : undefined,
    };
  });
  // Early in a season there can be no qualifiers at all.
  report('leaders', cats.length > 0 && entries.length === 0 && key === 'ppg' ? 'the points leaders are empty' : null);
  return entries;
}
