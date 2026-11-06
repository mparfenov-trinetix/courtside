import { CORE, getJson } from './client';
import type { Json } from './client';
import { currentSeason, teamLogo } from './common';
import type { Player } from './teams';

export type PlayerSeasonStats = {
  gamesPlayed?: number;
  gamesStarted?: number;
  ppg?: number;
  rpg?: number;
  apg?: number;
  spg?: number;
  bpg?: number;
  mpg?: number;
  fgPct?: number;
  threePct?: number;
  ftPct?: number;
};

export async function fetchPlayerStats(athleteId: string): Promise<PlayerSeasonStats> {
  const season = currentSeason();
  try {
    const json = await getJson(
      `${CORE}/seasons/${season}/types/2/athletes/${athleteId}/statistics/0?lang=en&region=us`
    );
    const allStats: Json[] = (json.splits?.categories ?? []).flatMap((c: Json) => c.stats ?? []);
    const stat = (name: string): number | undefined => {
      const s = allStats.find((x) => x.name === name);
      if (!s) return undefined;
      const v = Number(s.value);
      return isNaN(v) ? undefined : v;
    };
    // ESPN sometimes returns percentages as already-multiplied values (e.g. 48.7 instead of 0.487)
    const pct = (name: string): number | undefined => {
      const v = stat(name);
      if (v == null) return undefined;
      return v > 1 ? v / 100 : v;
    };
    return {
      gamesPlayed: stat('gamesPlayed'),
      gamesStarted: stat('gamesStarted'),
      ppg: stat('avgPoints'),
      rpg: stat('avgRebounds'),
      apg: stat('avgAssists'),
      spg: stat('avgSteals'),
      bpg: stat('avgBlocks'),
      mpg: stat('avgMinutes'),
      fgPct: pct('fieldGoalPct'),
      threePct: pct('threePointFieldGoalPct'),
      ftPct: pct('freeThrowPct'),
    };
  } catch {
    return {};
  }
}

export type GameLogEntry = {
  gameId: string;
  date: string;
  home: boolean;
  opponentId: string;
  opponent: string;
  opponentLogo: string;
  result?: 'W' | 'L';
  /** A playoff game (the rest are regular season). */
  playoffs?: boolean;
  teamScore: number;
  opponentScore: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  fg: string;
  tp: string;
  ft: string;
};

export async function fetchPlayerGameLog(athleteId: string): Promise<GameLogEntry[]> {
  const json = await getJson(
    `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}/gamelog`,
  );
  const names: string[] = json.names ?? [];
  const events: Record<string, Json> = json.events ?? {};
  // Regular season and playoffs together, so the latest games are really the latest games.
  const types: Json[] = (json.seasonTypes ?? []).filter((s: Json) => /regular|post/i.test(String(s.displayName)));

  const entries: GameLogEntry[] = [];
  for (const type of types) {
   const playoffs = /post/i.test(String(type.displayName));
   for (const cat of (type.categories ?? []) as Json[]) {
    for (const ev of (cat.events ?? []) as Json[]) {
      const meta = events[String(ev.eventId)];
      if (!meta) continue;
      const stats: string[] = ev.stats ?? [];
      const get = (name: string) => stats[names.indexOf(name)] ?? '';
      const num = (name: string) => {
        const n = parseFloat(get(name));
        return isNaN(n) ? 0 : n;
      };
      const away = meta.atVs === '@';
      const homeScore = parseInt(String(meta.homeTeamScore ?? '0'), 10) || 0;
      const awayScore = parseInt(String(meta.awayTeamScore ?? '0'), 10) || 0;
      const opp: Json = meta.opponent ?? {};
      entries.push({
        gameId: String(meta.id ?? ev.eventId),
        date: String(meta.gameDate ?? ''),
        home: !away,
        opponentId: String(opp.id ?? ''),
        opponent: opp.abbreviation ?? '',
        opponentLogo: opp.logoDark ?? opp.logo ?? '',
        result: meta.gameResult === 'W' || meta.gameResult === 'L' ? meta.gameResult : undefined,
        teamScore: away ? awayScore : homeScore,
        opponentScore: away ? homeScore : awayScore,
        min: num('minutes'),
        pts: num('points'),
        reb: num('totalRebounds'),
        ast: num('assists'),
        stl: num('steals'),
        blk: num('blocks'),
        to: num('turnovers'),
        pf: num('fouls'),
        fg: get('fieldGoalsMade-fieldGoalsAttempted'),
        tp: get('threePointFieldGoalsMade-threePointFieldGoalsAttempted'),
        ft: get('freeThrowsMade-freeThrowsAttempted'),
        playoffs,
      });
    }
   }
  }
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export type PlayerSearchResult = {
  id: string;
  name: string;
  /** The team ESPN lists him with (a retired player's last one), by full name. */
  teamName?: string;
  teamId?: string;
  teamAbbr?: string;
  headshot: string;
};

export const headshotUrl = (athleteId: string) =>
  `https://a.espncdn.com/i/headshots/nba/players/full/${athleteId}.png`;

/**
 * NBA players from ESPN's `search/v2` feed, in its own order (best known first). That feed searches every sport at once, so the
 * rows are filtered to the NBA by their uid (`s:40~l:46~a:<id>`) and it is asked for plenty of rows to leave enough of them. It knows
 * retired players (Garnett, Nowitzki, Gasol), which the older `common/v3/search` feed does not: that one lists only a few hundred
 * current and recent players, many of them unknown.
 */
export function normalizePlayerSearch(json: Json): PlayerSearchResult[] {
  const groups: Json[] = json.results ?? [];
  const seen = new Set<string>();
  return groups
    .filter((g) => g.type === 'player')
    .flatMap((g): Json[] => g.contents ?? [])
    .flatMap((c): PlayerSearchResult[] => {
      const id = /~l:46~a:(\d+)$/.exec(String(c.uid ?? ''))?.[1];
      // Only players ESPN has a photo of: the ones without are the unknowns (a few games decades ago, a two-way signing never played).
      const photo = c.image?.default ? String(c.image.default) : '';
      if (!id || seen.has(id) || !c.displayName || !photo) return [];
      seen.add(id);
      return [{ id, name: String(c.displayName), teamName: c.subtitle ? String(c.subtitle) : undefined, headshot: photo }];
    });
}

export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const q = encodeURIComponent(query.trim());
  const json = await getJson(`https://site.web.api.espn.com/apis/search/v2?query=${q}&type=player&limit=50`);
  return normalizePlayerSearch(json);
}

export type CareerRow = {
  year: number;
  season: string; // "2023-24"
  abbr: string; // team abbreviation, or "TOT" for a traded season's combined line
  logo?: string;
  stats: Record<string, string>; // keyed by ESPN's column labels (PTS, REB, FG%, ...)
};

export type PlayerCareer = {
  /** Per-game averages for each season, oldest first. */
  seasons: CareerRow[];
  career: Record<string, string>;
};

export async function fetchPlayerCareer(athleteId: string): Promise<PlayerCareer> {
  const json = await getJson(
    `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}/stats?region=us&lang=en&contentorigin=espn`,
  );
  const teams: Record<string, Json> = json.teams ?? {};
  const averages: Json | undefined = ((json.categories ?? []) as Json[]).find((c) => c.name === 'averages');
  const labels: string[] = averages?.labels ?? [];

  const seasons = ((averages?.statistics ?? []) as Json[]).map((s): CareerRow => {
    const team = teams[String(s.teamSlug)];
    const stats: Record<string, string> = {};
    labels.forEach((label, i) => { stats[label] = String(s.stats?.[i] ?? ''); });
    return {
      year: Number(s.season?.year ?? 0),
      season: String(s.season?.displayName ?? ''),
      abbr: team?.abbreviation ?? (/total/i.test(String(s.teamSlug)) ? 'TOT' : ''),
      logo: team?.abbreviation ? teamLogo(team.abbreviation, team?.logos?.[0]?.href) : team?.logos?.[0]?.href,
      stats,
    };
  });
  const career: Record<string, string> = {};
  labels.forEach((label, i) => { career[label] = String(averages?.totals?.[i] ?? ''); });
  return { seasons, career };
}

export type PlayerBio = {
  player: Player;
  /** His current team, or the last one he played for when he has left the league. */
  teamId: string | null;
  /** On an NBA roster right now. */
  active: boolean;
  /** "Sombor, Serbia" and "Serbia", when ESPN has them. */
  birthPlace?: string;
  citizenship?: string;
};

/**
 * Who a player is, straight from his athlete record. It works for anyone ESPN knows, including players
 * who have retired or never made a roster, which a team roster can't answer.
 */
export async function fetchPlayerBio(athleteId: string): Promise<PlayerBio> {
  const json = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}`);
  const a: Json = json.athlete ?? {};
  const name = String(a.displayName ?? a.fullName ?? '');
  const last = String(a.lastName ?? name.split(' ').slice(-1)[0] ?? '');
  const age = typeof a.age === 'number' ? a.age : undefined;
  const player: Player = {
    id: String(a.id ?? athleteId),
    name,
    shortName: a.firstName ? `${String(a.firstName)[0]}. ${last}` : name,
    jersey: a.jersey ? String(a.jersey) : undefined,
    position: a.position?.abbreviation,
    positionName: a.position?.displayName,
    height: a.displayHeight,
    weight: a.displayWeight,
    age,
    headshot: a.headshot?.href ?? headshotUrl(athleteId),
  };
  const teamId = a.team?.id != null && String(a.team.id) !== '' ? String(a.team.id) : null;
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return { player, teamId, active: a.active === true, birthPlace: text(a.displayBirthPlace), citizenship: text(a.citizenship) };
}
