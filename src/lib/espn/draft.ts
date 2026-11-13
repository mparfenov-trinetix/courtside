import { CORE, fetchRef, getJson, type Json } from './client';
import { currentSeason } from './common';
import { headshotUrl } from './legend-photos';

/**
 * The NBA Draft, year by year. ESPN's core API has it from 2003 (a 2000-2002 draft is an empty list): `draft/rounds` holds every pick
 * with links to the player and the team, and each pick's record holds the player (name, size, position, college, ESPN's own big-board rank
 * and its pre-draft scouting report). The `Draft` type of `player-profile.ts` is one player's own draft slot; this is the whole class.
 */

/** The first draft ESPN has picks for. */
export const DRAFT_FROM = 2003;

export type NbaDraftPlayer = {
  /** The record's id: the NBA athlete id from 2019 on, a college id before (`nbaId` says which). */
  id: string;
  name: string;
  position?: string;
  height?: string;
  weight?: string;
  /** "Duke", or undefined for a player who came from a club abroad. */
  college?: string;
  /** The college's logo or, for a player from abroad, his country's flag. */
  logo?: string;
  /** ESPN's NBA athlete id when the record links to the NBA player page (2019 on): his page and his photo. */
  nbaId?: string;
  headshot?: string;
  /** ESPN's rank of him on its pre-draft big board. */
  rank?: number;
  /** ESPN's pre-draft scouting report as plain text ("Strengths: ... Weaknesses: ..."). */
  scouting?: string;
};

export type NbaDraftPick = {
  overall: number;
  round: number;
  /** The pick's place inside its round. */
  pick: number;
  /** The team that made (or holds) the pick: the franchise's current ESPN team id. */
  teamId: string;
  traded: boolean;
  /** ESPN's note on a traded pick ("Traded to PHX"). */
  tradeNote?: string;
  /** Missing while the pick is still to be made. */
  player?: NbaDraftPlayer;
};

export type NbaDraft = { season: number; picks: NbaDraftPick[] };

/**
 * The drafts there are to show, newest first: every June from 2003 to the latest one that has happened (a draft is named by the season
 * it ends, so the June 2026 draft is 2026).
 */
export function draftSeasons(now: Date = new Date()): number[] {
  const last = Math.min(now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1, currentSeason());
  const out: number[] = [];
  for (let y = last; y >= DRAFT_FROM; y--) out.push(y);
  return out;
}

const idIn = (ref: unknown, collection: string): string | undefined =>
  typeof ref === 'string' ? new RegExp(`/${collection}/(\\d+)`).exec(ref)?.[1] : undefined;

/** ESPN writes the scouting report as HTML (`<strong>`, `<br>`): plain text with the paragraphs kept. */
export function scoutingText(html: unknown): string | undefined {
  if (typeof html !== 'string') return undefined;
  const text = html
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .trim();
  return text || undefined;
}

/** One pick: its slot and team from `draft/rounds`, the player from his own record and the college's name from the college's. */
function normalizeDraftPick(pick: Json, athlete?: Json, collegeName?: string): NbaDraftPick {
  const out: NbaDraftPick = {
    overall: Number(pick.overall ?? 0),
    round: Number(pick.round ?? 0),
    pick: Number(pick.pick ?? 0),
    teamId: idIn(pick.team?.$ref, 'teams') ?? '',
    traded: pick.traded === true,
    tradeNote: typeof pick.tradeNote === 'string' && pick.tradeNote ? pick.tradeNote : undefined,
  };
  if (!athlete?.displayName) return out;
  // The player's NBA page id sits in his record's player-card link; before 2019 it points at a college page, which is not his NBA id.
  const link = ((athlete.links ?? []) as Json[]).find((l) => (l.rel ?? []).includes('playercard'))?.href;
  const nbaId = typeof link === 'string' ? /\/nba\/player\/_\/id\/(\d+)/.exec(link)?.[1] : undefined;
  const attribute = (name: string) => ((athlete.attributes ?? []) as Json[]).find((a) => a.name === name)?.value;
  const rank = Number(attribute('overall'));
  const analysis = ((athlete.analysis ?? []) as Json[]).find((a) => a.type === 'predraft') ?? (athlete.analysis ?? [])[0];
  out.player = {
    id: String(athlete.id ?? ''),
    name: String(athlete.displayName),
    position: athlete.position?.abbreviation ? String(athlete.position.abbreviation) : undefined,
    height: athlete.displayHeight ? String(athlete.displayHeight) : undefined,
    weight: athlete.displayWeight ? String(athlete.displayWeight) : undefined,
    college: collegeName,
    logo: athlete.logo?.href ? String(athlete.logo.href) : undefined,
    nbaId,
    headshot: nbaId ? headshotUrl(nbaId) : undefined,
    rank: rank > 0 ? rank : undefined,
    scouting: scoutingText(analysis?.text),
  };
  return out;
}

/**
 * Pure: a draft from what ESPN sent: the `draft/rounds` response, each player's record by his record id and each college's name by its id.
 */
export function normalizeDraft(season: number, rounds: Json, athletes: Record<string, Json>, colleges: Record<string, string>): NbaDraft {
  const picks: NbaDraftPick[] = [];
  for (const round of (rounds.items ?? []) as Json[]) {
    for (const pick of (round.picks ?? []) as Json[]) {
      const athleteId = idIn(pick.athlete?.$ref, 'athletes');
      const athlete = athleteId ? athletes[athleteId] : undefined;
      const collegeId = idIn(athlete?.college?.$ref, 'colleges');
      picks.push(normalizeDraftPick(pick, athlete, collegeId ? colleges[collegeId] : undefined));
    }
  }
  return { season, picks: picks.sort((a, b) => a.overall - b.overall) };
}

/** A draft: one call for the picks, then each player's record and each (distinct) college's, all at once. A finished one never changes. */
export async function fetchDraft(season: number): Promise<NbaDraft> {
  const rounds = await getJson(`${CORE}/seasons/${season}/draft/rounds?lang=en&region=us`);
  const picks = ((rounds.items ?? []) as Json[]).flatMap((r) => (r.picks ?? []) as Json[]);
  const refs = new Map<string, unknown>();
  for (const p of picks) {
    const id = idIn(p.athlete?.$ref, 'athletes');
    if (id) refs.set(id, p.athlete.$ref);
  }
  const athletes: Record<string, Json> = {};
  await Promise.all([...refs].map(async ([id, ref]) => {
    const record = await fetchRef(ref);
    if (record) athletes[id] = record;
  }));
  const collegeRefs = new Map<string, unknown>();
  for (const a of Object.values(athletes)) {
    const id = idIn(a.college?.$ref, 'colleges');
    if (id) collegeRefs.set(id, a.college.$ref);
  }
  const colleges: Record<string, string> = {};
  await Promise.all([...collegeRefs].map(async ([id, ref]) => {
    const record = await fetchRef(ref);
    const name = record?.shortName ?? record?.name;
    if (name) colleges[id] = String(name);
  }));
  return normalizeDraft(season, rounds, athletes, colleges);
}
