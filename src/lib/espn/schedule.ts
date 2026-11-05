import { BASE, getJson } from './client';
import type { Json } from './client';
import { cupStage, currentSeason, parseScore, teamLogo } from './common';

export type Game = {
  id: string;
  date: string; // ISO
  home: boolean;
  opponent: string;
  opponentAbbr: string;
  opponentLogo: string;
  opponentId: string;
  teamScore?: number;
  opponentScore?: number;
  completed: boolean;
  result?: 'W' | 'L';
  /** NBA Cup stage ("Group Play", "Quarterfinals"...) when the game is part of the Cup. */
  cup?: string;
  /** ESPN's note for the game, e.g. "West 1st Round - Game 3" or "NBA Cup - Group Play". */
  note?: string;
};

export async function fetchTeamSchedule(
  teamId: string,
  opts: { season?: number; seasonType?: number } = {},
): Promise<Game[]> {
  const q = new URLSearchParams();
  if (opts.season) q.set('season', String(opts.season));
  if (opts.seasonType) q.set('seasontype', String(opts.seasonType));
  const json = await getJson(`${BASE}/teams/${teamId}/schedule${q.size ? `?${q}` : ''}`);
  const events: Json[] = json.events ?? [];
  return events.map((e): Game => {
    const comp: Json = e.competitions?.[0] ?? {};
    const competitors: Json[] = comp.competitors ?? [];
    const us = competitors.find((c) => String(c.team?.id) === teamId);
    const them = competitors.find((c) => String(c.team?.id) !== teamId);
    const completed: boolean = comp.status?.type?.completed === true;
    const teamScore = completed && us ? parseScore(us.score) : undefined;
    const opponentScore = completed && them ? parseScore(them.score) : undefined;
    const result: 'W' | 'L' | undefined =
      completed && typeof teamScore === 'number' && typeof opponentScore === 'number'
        ? teamScore > opponentScore ? 'W' : 'L'
        : undefined;
    const theirLogos: Json[] = them?.team?.logos ?? [];
    return {
      id: String(e.id),
      date: e.date ?? '',
      home: us?.homeAway === 'home',
      opponent: them?.team?.displayName ?? them?.team?.name ?? 'Unknown',
      opponentAbbr: them?.team?.abbreviation ?? '???',
      opponentLogo: teamLogo(them?.team?.abbreviation, theirLogos[0]?.href),
      opponentId: String(them?.team?.id ?? ''),
      cup: cupStage(comp.notes?.[0]?.headline),
      note: typeof comp.notes?.[0]?.headline === 'string' ? comp.notes[0].headline : undefined,
      teamScore,
      opponentScore,
      completed,
      result,
    };
  });
}

/**
 * Every game a team played (or has still to play) in a season: regular season, play-in and playoffs, oldest first.
 * ESPN serves each as its own schedule, so the three are read together; a part that fails or is empty is skipped.
 */
export async function fetchTeamSeason(teamId: string, season: number): Promise<Game[]> {
  const results = await Promise.allSettled([2, 5, 3].map((seasonType) => fetchTeamSchedule(teamId, { season, seasonType })));
  if (results.every((r) => r.status === 'rejected')) throw (results[0] as PromiseRejectedResult).reason;
  const byId = new Map<string, Game>();
  for (const r of results) if (r.status === 'fulfilled') for (const g of r.value) byId.set(g.id, g);
  return [...byId.values()].sort((x, y) => x.date.localeCompare(y.date));
}

/** A finished meeting between two teams, from the first team's side. */
export type HeadToHeadGame = Game & { result: 'W' | 'L'; teamScore: number; opponentScore: number };

const isPlayed = (g: Game): g is HeadToHeadGame =>
  g.completed && g.result != null && typeof g.teamScore === 'number' && typeof g.opponentScore === 'number';

/**
 * The latest finished games between two teams, newest first. ESPN has no head-to-head feed, so this reads
 * the first team's schedules (regular season and playoffs) season by season, newest first, until it has enough.
 */
export async function fetchHeadToHead(teamId: string, rivalId: string, limit = 10, maxSeasons = 6): Promise<HeadToHeadGame[]> {
  const found = new Map<string, HeadToHeadGame>();
  let failures = 0;
  let requests = 0;
  // Seasons are read three at a time (six requests together) rather than one by one: ten meetings are usually within the
  // last three seasons, and the page waits for the slowest of them, not for their sum.
  const CHUNK = 3;
  for (let from = currentSeason(); from > currentSeason() - maxSeasons && found.size < limit; from -= CHUNK) {
    const seasons = Array.from({ length: CHUNK }, (_, i) => from - i).filter((season) => season > currentSeason() - maxSeasons);
    const results = await Promise.allSettled(seasons.flatMap((season) => [2, 3].map((seasonType) => fetchTeamSchedule(teamId, { season, seasonType }))));
    for (const r of results) {
      requests++;
      if (r.status === 'rejected') failures++;
      else for (const g of r.value) if (g.opponentId === rivalId && isPlayed(g)) found.set(g.id, g);
    }
  }
  // A season with no playoffs answers with an error or nothing: only fail when nothing at all could be read.
  if (found.size === 0 && failures === requests) throw new Error('Could not load head-to-head history');
  return [...found.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
