import { BASE, CORE, fetchRef, getJson, type Json } from './client';
import { currentSeason } from './common';
import { headshotUrl } from './legend-photos';

/**
 * ESPN has no All-Star selections, only the All-Star MVP. The game itself is on the scoreboard though, so who played in
 * it says who was an All-Star. These are the game days (US Eastern) of each All-Star Game; a season is named by the year
 * it ends in, which is the February of the game. ESPN has the 2002 game's score but no box score (nobody played, as far as its
 * feed says), and nothing of the 2000 and 2001 games but their MVP award (`MVP_ONLY`); box scores start in 2003.
 */
const GAME_DAYS: Record<number, string> = {
  2002: '0210', 2003: '0209', 2004: '0215', 2005: '0220', 2006: '0219', 2007: '0218', 2008: '0217', 2009: '0215', 2010: '0214',
  2011: '0220', 2012: '0226', 2013: '0217', 2014: '0216', 2015: '0215', 2016: '0214', 2017: '0219', 2018: '0218',
  2019: '0217', 2020: '0216', 2021: '0307', 2022: '0220', 2023: '0219', 2024: '0218', 2025: '0216', 2026: '0215',
};

/** All-Star Games whose game ESPN does not have at all, only the MVP (2000 had two: Duncan and O'Neal). */
const MVP_ONLY = [2000, 2001];

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

// ─── The weekend, season by season ───────────────────────────────────────────────────────────────────────────────

/** One side of an All-Star game. The team is whatever the format calls it: East, Team Shaq, Team Stripes. */
export type AllStarTeam = { id: string; name: string; abbr: string; logo?: string; score: number; winner: boolean };

export type AllStarGame = {
  id: string;
  /** "Championship", "Semifinals", "Round Robin" or just "All-Star Game" (East against West). */
  round: string;
  /** The rule of that game, when ESPN names one: "First team to 40 points wins - Untimed". */
  rule?: string;
  date: string;
  final: boolean;
  teams: [AllStarTeam, AllStarTeam];
};

/** A player's line in the weekend, added up over the games he played (the format may have him play two). */
export type AllStarPlayer = {
  id: string;
  name: string;
  headshot?: string;
  teamName: string;
  /** Whether he started: unknown (undefined) for a game whose feed flags no starter at all. */
  starter?: boolean;
  min: number;
  pts: number;
  reb: number;
  ast: number;
};

export type AllStarMvp = { id: string; name: string; headshot?: string; teamName?: string };

export type AllStarWeekend = {
  season: number;
  venue?: string;
  city?: string;
  /** ISO time of the first game. */
  date?: string;
  games: AllStarGame[];
  players: AllStarPlayer[];
  /** The All-Star MVP; two in 2000 (Duncan and O'Neal shared it). */
  mvps: AllStarMvp[];
};

/**
 * "NBA All-Star - Semifinals First team to 40 points wins - Untimed" -> the round and the rule. Older years just say
 * "NBA All-Star Game".
 */
export function parseAllStarNote(headline: string | undefined): { round: string; rule?: string } {
  const m = /^NBA All-Star(?: Game)?(?: - (Round Robin|Semifinals?|Championship|Finals?))?\s*(.*)$/i.exec((headline ?? '').trim());
  const round = m?.[1] ? m[1].replace(/^(\w)/, (c) => c.toUpperCase()) : 'All-Star Game';
  const rule = m?.[2]?.trim();
  return { round, rule: rule || undefined };
}

/** One event of the All-Star day's scoreboard as a game. */
export function normalizeAllStarGame(event: Json): AllStarGame {
  const comp = (event.competitions?.[0] ?? {}) as Json;
  const { round, rule } = parseAllStarNote(comp.notes?.[0]?.headline);
  const side = (c: Json): AllStarTeam => ({
    id: String(c.team?.id ?? ''),
    name: String(c.team?.displayName ?? c.team?.name ?? ''),
    abbr: String(c.team?.abbreviation ?? ''),
    logo: c.team?.logo ? String(c.team.logo) : undefined,
    score: Number(c.score ?? 0) || 0,
    winner: !!c.winner,
  });
  const teams = ((comp.competitors ?? []) as Json[]).map(side);
  // ESPN lists the home side first; the page shows the first-named team on the left.
  return {
    id: String(event.id),
    round,
    rule,
    date: String(event.date ?? ''),
    final: event.status?.type?.completed === true,
    teams: [teams[1] ?? teams[0], teams[0]] as [AllStarTeam, AllStarTeam],
  };
}

type Counts = { pts: number; reb: number; ast: number };

/**
 * Points, rebounds and assists from a game's play-by-play, for a game whose box score ESPN left empty: it lists the twenty-odd players of
 * every All-Star Game from 2003 to 2012 with a zero in every column (and "--" minutes), yet has the whole game play by play. A scoring play
 * is the shooter's points (a free throw too) and, when its text names an assist, the second participant's assist; a rebound is any
 * rebound play with a player on it (a team rebound has none). The points of every year from 2004 add up to the game's final score;
 * 2003's feed misses eight of its 300.
 */
export function allStarCountsFromPlays(plays: Json[]): Map<string, Counts> {
  const counts = new Map<string, Counts>();
  const of = (id: string) => {
    let c = counts.get(id);
    if (!c) counts.set(id, (c = { pts: 0, reb: 0, ast: 0 }));
    return c;
  };
  for (const play of plays) {
    const ids = ((play.participants ?? []) as Json[]).flatMap((p) => (p.athlete?.id != null ? [String(p.athlete.id)] : []));
    if (ids.length === 0) continue;
    if (play.scoringPlay) {
      of(ids[0]).pts += Number(play.scoreValue) || 0;
      if (ids[1] && /assist/i.test(String(play.text ?? ''))) of(ids[1]).ast += 1;
    }
    if (/rebound/i.test(String(play.type?.text ?? ''))) of(ids[0]).reb += 1;
  }
  return counts;
}

/** Everyone who played, from the games' box scores, one line each (summed over the games he played), the top scorers first. */
export function normalizeAllStarPlayers(summaries: Json[]): AllStarPlayer[] {
  const byId = new Map<string, AllStarPlayer>();
  for (const summary of summaries) {
    const blocks = ((summary.boxscore?.players ?? []) as Json[]).map((team) => ({ team, block: (team.statistics?.[0] ?? {}) as Json }));
    const rows = blocks.flatMap(({ block }) => (block.athletes ?? []) as Json[]);
    // An empty box score (every PTS a zero): the counting stats come from the play-by-play instead.
    const boxPoints = blocks.reduce((sum, { block }) => {
      const at = ((block.labels ?? []) as string[]).indexOf('PTS');
      return sum + ((block.athletes ?? []) as Json[]).reduce((s, a) => s + (Number.parseFloat(a.stats?.[at] ?? '') || 0), 0);
    }, 0);
    const derived = boxPoints === 0 ? allStarCountsFromPlays((summary.plays ?? []) as Json[]) : undefined;
    // Some games flag no starter at all: then who started is not known, which is not the same as nobody starting.
    const startersKnown = rows.some((a) => a.starter);
    for (const { team, block } of blocks) {
      const labels: string[] = block.labels ?? [];
      const at = (label: string) => labels.indexOf(label);
      for (const a of (block.athletes ?? []) as Json[]) {
        const id = String(a.athlete?.id ?? '');
        if (!id) continue;
        const stat = (label: string) => Number.parseFloat(a.stats?.[at(label)] ?? '') || 0;
        const counts = derived ? (derived.get(id) ?? { pts: 0, reb: 0, ast: 0 }) : { pts: stat('PTS'), reb: stat('REB'), ast: stat('AST') };
        const line = { min: stat('MIN'), ...counts };
        const starter = startersKnown ? !!a.starter : undefined;
        const seen = byId.get(id);
        if (seen) {
          seen.min += line.min;
          seen.pts += line.pts;
          seen.reb += line.reb;
          seen.ast += line.ast;
          if (starter != null) seen.starter = !!seen.starter || starter;
        } else {
          byId.set(id, {
            id,
            name: String(a.athlete?.displayName ?? ''),
            headshot: a.athlete?.headshot?.href ? String(a.athlete.headshot.href) : headshotUrl(id),
            teamName: String(team.team?.displayName ?? ''),
            starter,
            ...line,
          });
        }
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
}

/** The All-Star MVP from the core API's award record: the athlete and the team he played for that day. */
export function normalizeAllStarMvp(athlete: Json | undefined, team: Json | undefined): AllStarMvp | undefined {
  if (!athlete?.displayName) return undefined;
  return {
    id: String(athlete.id ?? ''),
    name: String(athlete.displayName),
    headshot: athlete.headshot?.href ? String(athlete.headshot.href) : athlete.id ? headshotUrl(String(athlete.id)) : undefined,
    teamName: team?.displayName ? String(team.displayName) : undefined,
  };
}

/** Pure: the weekend of a season from what ESPN sent (the day's scoreboard, each game's summary, the MVP's records). */
export function normalizeAllStarWeekend(
  season: number,
  scoreboard: Json,
  summaries: Json[],
  mvps: { athlete?: Json; team?: Json }[] = [],
): AllStarWeekend {
  const events = ((scoreboard.events ?? []) as Json[]).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const venue = (events[0]?.competitions?.[0]?.venue ?? {}) as Json;
  return {
    season,
    venue: venue.fullName ? String(venue.fullName) : undefined,
    city: venue.address?.city ? String(venue.address.city) : undefined,
    date: events[0]?.date ? String(events[0].date) : undefined,
    games: events.map(normalizeAllStarGame),
    players: normalizeAllStarPlayers(summaries),
    mvps: mvps.map((m) => normalizeAllStarMvp(m.athlete, m.team)).filter((m): m is AllStarMvp => m != null),
  };
}

/** The seasons ESPN has an All-Star Game for, newest first (the day is in the table above; add each new February). */
export const allStarSeasons = (): number[] =>
  [...Object.keys(GAME_DAYS).map(Number), ...MVP_ONLY]
    .filter((y) => y <= currentSeason())
    .sort((a, b) => b - a);

/**
 * One season's All-Star Game day: the game or games (the format changes: East against West, a draft of captains' teams, a mini
 * tournament of three), who played and the MVP. ESPN has nothing on the Saturday contests (dunk, three-point, skills): they are not
 * on the scoreboard and have no award, so they are not here.
 */
export async function fetchAllStarWeekend(season: number): Promise<AllStarWeekend> {
  const day = GAME_DAYS[season];
  const ids: string[] = [];
  let scoreboard: Json = {};
  if (day) {
    scoreboard = await getJson(`${BASE}/scoreboard?dates=${season}${day}`);
    for (const e of (scoreboard.events ?? []) as { id: unknown }[]) ids.push(String(e.id));
  }
  const [summaries, award] = await Promise.all([
    Promise.all(ids.map((id) => getJson(`${BASE}/summary?event=${id}`))),
    // All-Star MVP is award 53; a season without the record just has no MVP shown.
    getJson(`${CORE}/seasons/${season}/awards/53?lang=en&region=us`).catch(() => undefined),
  ]);
  const mvps = await Promise.all(
    ((award?.winners ?? []) as Json[]).map(async (w) => {
      const [athlete, team] = await Promise.all([fetchRef(w.athlete?.$ref), fetchRef(w.team?.$ref)]);
      return { athlete, team };
    }),
  );
  return normalizeAllStarWeekend(season, scoreboard, summaries, mvps);
}
