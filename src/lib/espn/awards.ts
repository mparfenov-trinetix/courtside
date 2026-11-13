import { CORE, HttpError, fetchRef, getJson, type Json } from './client';
import { currentSeason } from './common';
import { headshotUrl } from './legend-photos';

/**
 * The season awards, year by year. ESPN's core API lists a season's awards (`seasons/{year}/awards`, from 1980; the list grows over the
 * years: Sixth Man, Most Improved and the three All-NBA teams from the 80s, the Cup awards from 2024) and each award holds only its
 * winners, one for an individual award and five for a team. There is no voting and no runner-up, so there is no "top 3" for a past
 * season. A winner is an `$ref` to his athlete record and to the team he played for that season (the franchise's current ESPN id).
 */

/** The first season the screen shows (1999-00; ESPN has awards back to 1980, but the older years were left out on purpose). */
export const AWARDS_FROM = 2000;

export type AwardWinner = {
  id: string;
  name: string;
  position?: string;
  headshot?: string;
  /** The franchise's ESPN team id (a defunct name shows the franchise as it is today). */
  teamId?: string;
};

export type Award = { id: string; name: string; winners: AwardWinner[] };

/** What the screen groups awards under, in the order it shows them. */
export type AwardGroupKey = 'major' | 'playoffs' | 'other' | 'allnba' | 'alldefense' | 'allrookie' | 'cup';

export type AwardGroup = { key: AwardGroupKey; title: string; awards: Award[] };

export type SeasonAwards = { season: number; groups: AwardGroup[] };

/** The awards the app shows: ESPN's award id, the group it sits in and the name it goes by (its own names are long: "NBA Eastern Conference Finals MVP"). */
const AWARDS: { id: string; group: AwardGroupKey; name: string }[] = [
  { id: '33', group: 'major', name: 'MVP' },
  { id: '39', group: 'major', name: 'Defensive Player of the Year' },
  { id: '35', group: 'major', name: 'Rookie of the Year' },
  { id: '40', group: 'major', name: 'Sixth Man of the Year' },
  { id: '36', group: 'major', name: 'Most Improved Player' },
  { id: '297', group: 'major', name: 'Clutch Player of the Year' },
  { id: '43', group: 'playoffs', name: 'Finals MVP' },
  { id: '218', group: 'playoffs', name: 'Eastern Conference Finals MVP' },
  { id: '217', group: 'playoffs', name: 'Western Conference Finals MVP' },
  { id: '53', group: 'other', name: 'All-Star Game MVP' },
  { id: '77', group: 'other', name: 'Teammate of the Year' },
  { id: '44', group: 'allnba', name: 'First Team' },
  { id: '45', group: 'allnba', name: 'Second Team' },
  { id: '46', group: 'allnba', name: 'Third Team' },
  { id: '49', group: 'alldefense', name: 'First Team' },
  { id: '50', group: 'alldefense', name: 'Second Team' },
  { id: '47', group: 'allrookie', name: 'First Team' },
  { id: '48', group: 'allrookie', name: 'Second Team' },
  { id: '377', group: 'cup', name: 'NBA Cup MVP' },
  { id: '378', group: 'cup', name: 'All-Tournament Team' },
];

const GROUPS: { key: AwardGroupKey; title: string }[] = [
  { key: 'major', title: 'Season awards' },
  { key: 'playoffs', title: 'Playoffs' },
  { key: 'other', title: 'More awards' },
  { key: 'allnba', title: 'All-NBA' },
  { key: 'alldefense', title: 'All-Defensive' },
  { key: 'allrookie', title: 'All-Rookie' },
  { key: 'cup', title: 'NBA Cup' },
];

/** Court order for a team of five: guards, forwards, then the center. */
const POSITION_ORDER = ['PG', 'G', 'SG', 'GF', 'SF', 'F', 'PF', 'FC', 'C'];
const positionRank = (p?: string): number => {
  const at = POSITION_ORDER.indexOf(p ?? '');
  return at < 0 ? POSITION_ORDER.length : at;
};

const idIn = (ref: unknown, collection: string): string | undefined =>
  typeof ref === 'string' ? new RegExp(`/${collection}/(\\d+)`).exec(ref)?.[1] : undefined;

/**
 * The seasons there are awards to show, newest first. A season's awards are given in the spring, so from April its own season counts and
 * before that (and through the autumn, when the next season has begun) the latest is the one that finished.
 */
export function awardSeasons(now: Date = new Date()): number[] {
  const month = now.getMonth();
  const last = month >= 3 && month < 9 ? currentSeason() : currentSeason() - 1;
  const out: number[] = [];
  for (let y = last; y >= AWARDS_FROM; y--) out.push(y);
  return out;
}

function normalizeWinner(winner: Json, athletes: Record<string, Json>): AwardWinner | undefined {
  const id = idIn(winner.athlete?.$ref, 'athletes');
  const athlete = id ? athletes[id] : undefined;
  if (!id || !athlete?.displayName) return undefined;
  return {
    id,
    name: String(athlete.displayName),
    // ESPN says "NA" for the players of the early years.
    position: athlete.position?.abbreviation && athlete.position.abbreviation !== 'NA' ? String(athlete.position.abbreviation) : undefined,
    headshot: athlete.headshot?.href ? String(athlete.headshot.href) : headshotUrl(id),
    teamId: idIn(winner.team?.$ref, 'teams'),
  };
}

/** The athlete ids a season's award records name (the records to look up). */
export function awardAthleteIds(awards: Json[]): string[] {
  const ids = new Set<string>();
  for (const award of awards) {
    for (const w of (award.winners ?? []) as Json[]) {
      const id = idIn(w.athlete?.$ref, 'athletes');
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Pure: a season's awards from the records ESPN sent (each award, and the athletes it names by id). Awards ESPN has no winner for are left
 * out, and so are groups with nothing in them; a team of five is in court order.
 */
export function normalizeSeasonAwards(season: number, awards: Json[], athletes: Record<string, Json>): SeasonAwards {
  const byId = new Map(awards.map((a) => [String(a.id), a]));
  const groups: AwardGroup[] = [];
  for (const group of GROUPS) {
    const list: Award[] = [];
    for (const spec of AWARDS.filter((a) => a.group === group.key)) {
      const record = byId.get(spec.id);
      const winners = ((record?.winners ?? []) as Json[]).flatMap((w) => normalizeWinner(w, athletes) ?? []);
      if (winners.length === 0) continue;
      if (winners.length > 1) winners.sort((a, b) => positionRank(a.position) - positionRank(b.position) || a.name.localeCompare(b.name));
      list.push({ id: spec.id, name: spec.name, winners });
    }
    if (list.length > 0) groups.push({ key: group.key, title: group.title, awards: list });
  }
  return { season, groups };
}

/**
 * One season's awards: the list of its awards, each award's record, then the winners' athlete records (about fifty requests for a season
 * with all the teams, all at once). A finished season never changes.
 */
export async function fetchSeasonAwards(season: number): Promise<SeasonAwards> {
  // ESPN answering that a season has no awards yet is an empty season; the network failing is an error to retry, not a finished season with nothing in it.
  const list = await getJson(`${CORE}/seasons/${season}/awards?lang=en&region=us`).catch((error) => {
    if (error instanceof HttpError) return undefined;
    throw error;
  });
  const wanted = new Set(AWARDS.map((a) => a.id));
  const refs = ((list?.items ?? []) as Json[]).map((i) => i.$ref).filter((ref) => wanted.has(idIn(ref, 'awards') ?? ''));
  const awards = (await Promise.all(refs.map((ref) => fetchRef(ref)))).filter((a): a is Json => a != null);
  const records = await Promise.all(
    awardAthleteIds(awards).map(async (id) => [id, await fetchRef(`${CORE}/athletes/${id}?lang=en&region=us`)] as const),
  );
  const athletes: Record<string, Json> = {};
  for (const [id, record] of records) if (record) athletes[id] = record;
  return normalizeSeasonAwards(season, awards, athletes);
}
