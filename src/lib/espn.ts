/**
 * ESPN's public (undocumented) NBA endpoints. No API key needed.
 * The response shapes are not guaranteed, so everything is normalized
 * defensively into our own small types before it reaches the UI.
 */
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

export type Team = {
  id: string;
  abbreviation: string;
  location: string; // "Boston"
  name: string; // "Celtics"
  displayName: string; // "Boston Celtics"
  color: string; // "#007A33"
  alternateColor: string;
  logo: string; // logo for light backgrounds
  logoDark: string; // logo for dark backgrounds (falls back to logo)
  /** ESPN's own dark-background variant, for sitting on the team's primary color (see logoOn). */
  logoOnPrimary?: string;
  /** ESPN's secondary logo (a lettered wordmark for a few teams, an alternate emblem for the rest), for headers. */
  mark?: string;
};

export type TeamDetail = Team & {
  record?: string; // "48-34"
  homeRecord?: string;
  awayRecord?: string;
  standing?: string; // "2nd in Atlantic Division"
  venue?: string;
};

export type Player = {
  id: string;
  name: string;
  shortName: string;
  jersey?: string;
  position?: string; // "PG"
  positionName?: string; // "Point Guard"
  height?: string;
  weight?: string;
  /** Same measurements in metric, derived from ESPN's inches and pounds. */
  heightCm?: number;
  weightKg?: number;
  /** Date of birth as YYYY-MM-DD. */
  born?: string;
  age?: number;
  college?: string;
  experience?: number;
  headshot?: string;
};

export type Roster = {
  players: Player[];
  coach?: string;
};

type Json = Record<string, any>;

/**
 * ESPN can change a response shape without notice. Normalizers call `report` when a response parses
 * but looks wrong (no standings rows, no play-by-play for a finished game...). The app registers a
 * reporter that shows a banner; a null detail means the source is healthy again.
 */
type HealthReporter = (source: string, detail: string | null) => void;
let report: HealthReporter = () => {};
export function setHealthReporter(fn: HealthReporter) {
  report = fn;
}

/**
 * Optional caching gateway (see gateway/). When EXPO_PUBLIC_ESPN_PROXY is set, calls to ESPN go through
 * it: `<proxy>/<source>/<path>` where the source stands in for the ESPN base URL. Unset = straight to ESPN.
 */
const PROXY_SOURCES: [prefix: string, source: string][] = [
  ['https://site.api.espn.com/apis/site/v2/sports/basketball/nba', 'site'],
  ['https://site.web.api.espn.com/apis/v2/sports/basketball/nba', 'web2'],
  ['https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba', 'web3'],
  ['https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba', 'core'],
  ['https://site.web.api.espn.com/apis/common/v3/search', 'search'],
];

export function viaProxy(url: string, proxy: string | undefined): string {
  if (!proxy) return url;
  for (const [prefix, source] of PROXY_SOURCES) {
    if (url.startsWith(prefix)) return `${proxy.replace(/\/+$/, '')}/${source}${url.slice(prefix.length) || '/'}`;
  }
  return url;
}

async function getJson(url: string): Promise<Json> {
  const res = await fetch(viaProxy(url, process.env.EXPO_PUBLIC_ESPN_PROXY));
  if (!res.ok) throw new Error(`ESPN returned ${res.status} for ${url}`);
  return res.json();
}

function hex(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
  return `#${value.toUpperCase()}`;
}

function pickLogo(logos: Json[] | undefined, variant: 'default' | 'dark') {
  if (!Array.isArray(logos) || logos.length === 0) return '';
  const match = logos.find((l) => Array.isArray(l.rel) && l.rel.includes(variant));
  return (match ?? logos[0]).href ?? '';
}

function normalizeTeam(t: Json): Team {
  const logo = pickLogo(t.logos, 'default') || (typeof t.logo === 'string' ? t.logo : '');
  return {
    id: String(t.id),
    abbreviation: t.abbreviation ?? '',
    location: t.location ?? '',
    name: t.name ?? t.nickname ?? t.shortDisplayName ?? '',
    displayName: t.displayName ?? `${t.location ?? ''} ${t.name ?? ''}`.trim(),
    color: hex(t.color, '#1D428A'),
    alternateColor: hex(t.alternateColor, '#C8102E'),
    logo,
    // ESPN's "dark" variant is a flat white mark for these teams, which loses the team's identity on the
    // app's dark background: show the colored logo there instead.
    logoDark: COLORED_ON_DARK.has(t.abbreviation) ? logo : pickLogo(t.logos, 'dark') || logo,
    logoOnPrimary: pickLogo(t.logos, 'dark') || logo,
    mark: markUrl(t.logos),
  };
}

/** The 4096px originals are resized through ESPN's image service. */
function markUrl(logos: Json[] | undefined): string | undefined {
  const href: string | undefined = (logos ?? []).find((l) => Array.isArray(l.rel) && l.rel.includes('secondary_logo_on_black_color'))?.href;
  const guid = href?.split('/guid/')[1];
  return guid ? `https://a.espncdn.com/combiner/i?img=/guid/${guid}&w=400&h=400&transparent=true` : undefined;
}

const COLORED_ON_DARK = new Set(['TOR']);

/** "NBA Cup - Group Play" -> "Group Play"; undefined for any game that isn't Cup. */
export function cupStage(note: unknown): string | undefined {
  const m = /NBA Cup\s*[-–:]?\s*(.*)$/i.exec(typeof note === 'string' ? note : '');
  return m ? m[1].trim() || 'NBA Cup' : undefined;
}

export async function fetchTeams(): Promise<Team[]> {
  const json = await getJson(`${BASE}/teams`);
  const raw: Json[] = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return raw
    .map((entry) => normalizeTeam(entry.team ?? entry))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function fetchTeamDetail(teamId: string): Promise<TeamDetail> {
  const json = await getJson(`${BASE}/teams/${teamId}`);
  const t = json.team ?? {};
  const items: Json[] = t.record?.items ?? [];
  const byType = (type: string) => items.find((i) => i.type === type)?.summary;
  return {
    ...normalizeTeam(t),
    record: byType('total') ?? items[0]?.summary,
    homeRecord: byType('home'),
    awayRecord: byType('road') ?? byType('away'),
    standing: t.standingSummary,
    venue: t.franchise?.venue?.fullName,
  };
}

function normalizePlayer(a: Json): Player {
  return {
    id: String(a.id),
    name: a.displayName ?? a.fullName ?? 'Unknown player',
    shortName: a.shortName ?? a.displayName ?? '',
    jersey: a.jersey,
    position: a.position?.abbreviation,
    positionName: a.position?.displayName,
    height: a.displayHeight,
    weight: a.displayWeight,
    heightCm: typeof a.height === 'number' && a.height > 0 ? Math.round(a.height * 2.54) : undefined,
    weightKg: typeof a.weight === 'number' && a.weight > 0 ? Math.round(a.weight * 0.45359237) : undefined,
    born: typeof a.dateOfBirth === 'string' ? a.dateOfBirth.slice(0, 10) : undefined,
    age: typeof a.age === 'number' ? a.age : undefined,
    college: a.college?.name ?? a.college?.shortName,
    experience: a.experience?.years,
    headshot: a.headshot?.href,
  };
}

export async function fetchRoster(teamId: string): Promise<Roster> {
  const json = await getJson(`${BASE}/teams/${teamId}/roster`);
  const raw: Json[] = json.athletes ?? [];
  // NBA rosters are flat, other sports group athletes by position: handle both.
  const flat = raw.flatMap((entry) => (Array.isArray(entry.items) ? entry.items : [entry]));
  const players = flat
    .map(normalizePlayer)
    .sort((a, b) => Number(a.jersey ?? 999) - Number(b.jersey ?? 999));
  const coach = Array.isArray(json.coach) && json.coach[0]
    ? `${json.coach[0].firstName ?? ''} ${json.coach[0].lastName ?? ''}`.trim()
    : undefined;
  return { players, coach };
}

// ─── Schedule ────────────────────────────────────────────────────────────────

function parseScore(score: unknown): number | undefined {
  if (score == null) return undefined;
  if (typeof score === 'object' && score !== null && 'value' in score) return (score as Json).value;
  const n = Number(score);
  return isNaN(n) ? undefined : n;
}

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
      opponentLogo: theirLogos[0]?.href ?? '',
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

// ─── League leaders ───────────────────────────────────────────────────────────

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

/** The NBA season's ending year: 2027 is the 2026-27 season. */
export function currentSeason(): number {
  const now = new Date();
  return now.getFullYear() + (now.getMonth() >= 9 ? 1 : 0);
}

/** 2027 -> "2026-27". */
export const seasonLabel = (year: number) => `${year - 1}-${String(year).slice(2)}`;

const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';

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

// ─── Standings ────────────────────────────────────────────────────────────────

export type StandingEntry = {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  wins: number;
  losses: number;
  winPct: number;
  gamesBehind: number;
  seed: number;
  streak: string;
  lastTen: string;
  home: string;
  road: string;
  diff: number;
};

export type ConferenceStandings = {
  east: StandingEntry[];
  west: StandingEntry[];
};

export async function fetchStandings(season: number = currentSeason()): Promise<ConferenceStandings> {
  // Past seasons come from a different shape of the same feed (conferences carry their table directly).
  const json = await getJson(
    season === currentSeason()
      ? 'https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&type=0&level=3'
      : `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${season}`,
  );
  const conferences: Json[] = json.children ?? [];

  const parseConference = (conf: Json): StandingEntry[] => {
    const entries: Json[] = conf.standings?.entries
      ? conf.standings.entries
      : (conf.children ?? []).flatMap((div: Json) => div.standings?.entries ?? []);
    return entries
      .map((e) => {
        const team = e.team ?? {};
        const stats: Json[] = e.stats ?? [];
        const stat = (name: string): number => (stats.find((s) => s.name === name)?.value ?? 0) as number;
        const text = (name: string): string => String(stats.find((s) => s.name === name || s.type === name)?.displayValue ?? '');
        return {
          teamId: String(team.id ?? ''),
          teamName: team.displayName ?? `${team.location ?? ''} ${team.name ?? ''}`.trim(),
          teamAbbr: team.abbreviation ?? '',
          teamLogo: team.logos?.[0]?.href ?? '',
          wins: stat('wins'),
          losses: stat('losses'),
          winPct: stat('winPercent'),
          gamesBehind: stat('gamesBehind'),
          seed: Math.round(stat('playoffSeed')),
          streak: text('streak'),
          lastTen: text('lasttengames'),
          home: text('Home'),
          road: text('Road'),
          diff: stat('differential'),
        };
      })
      .filter((e) => e.seed > 0)
      .sort((a, b) => a.seed - b.seed);
  };

  const east = conferences.find((c) => String(c.name ?? '').includes('Eastern') || c.id === '5');
  const west = conferences.find((c) => String(c.name ?? '').includes('Western') || c.id === '6');

  const standings = {
    east: east ? parseConference(east) : [],
    west: west ? parseConference(west) : [],
  };
  report('standings', standings.east.length < 10 || standings.west.length < 10 ? 'standings table is incomplete' : null);
  return standings;
}

// ─── Player stats ─────────────────────────────────────────────────────────────

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

// ─── Game summary / Box score ─────────────────────────────────────────────────

export type BoxScorePlayer = {
  id: string;
  name: string;
  shortName: string;
  jersey?: string;
  position?: string;
  headshot?: string;
  starter: boolean;
  didNotPlay: boolean;
  stats: Record<string, string>; // e.g. { PTS: "22", REB: "6", FG: "8-18" }
};

export type BoxScoreTeam = {
  team: Team;
  homeAway: 'home' | 'away';
  score: number;
  linescores: number[];
  starters: BoxScorePlayer[];
  bench: BoxScorePlayer[];
  totals: Record<string, string>;
  columnNames: string[];
  /** Live games only: ESPN's remaining timeouts and foul/bonus state for the current period. */
  timeoutsRemaining?: number;
  fouls?: { team: number; period: number; toGive: number; bonus: boolean };
};

export type Play = {
  id: string;
  period: number;
  clockText: string;
  text: string;
  typeText: string;
  teamId?: string;
  homeScore: number;
  awayScore: number;
  scoring: boolean;
  scoreValue: number;
  shooting: boolean;
  pointsAttempted: number;
  athleteIds: string[];
  /** Shot location in feet on a normalized half court (basket at x=25, y=5.25). */
  x?: number;
  y?: number;
};

export type Injury = {
  teamId: string;
  athleteId: string;
  name: string;
  position?: string;
  headshot?: string;
  status: string;
  detail?: string;
  returnDate?: string;
};

export type GameInfo = {
  venue?: string;
  city?: string;
  attendance?: number;
  officials: string[];
  broadcast?: string;
  date?: string;
  seriesSummary?: string;
  injuries: Injury[];
};

export type GameSummary = {
  id: string;
  status: string;
  completed: boolean;
  live: boolean;
  home: BoxScoreTeam;
  away: BoxScoreTeam;
  plays: Play[];
  /** Home win probability (0–1) keyed by play id. */
  winProb: Record<string, number>;
  info: GameInfo;
  /** NBA Cup stage when the game is part of the Cup. */
  cup?: string;
};

export async function fetchGameSummary(gameId: string): Promise<GameSummary> {
  const summary = normalizeGameSummary(await getJson(`${BASE}/summary?event=${gameId}`), gameId);
  const started = summary.completed || summary.live;
  const noBox = [...summary.home.starters, ...summary.home.bench, ...summary.away.starters, ...summary.away.bench].length === 0;
  report('game', started && (summary.plays.length === 0 || noBox) ? 'play-by-play or box score missing' : null);
  return summary;
}

export function normalizeGameSummary(json: Json, gameId: string): GameSummary {
  const comp: Json = json.header?.competitions?.[0] ?? {};
  const competitors: Json[] = comp.competitors ?? [];
  const statusType: Json = comp.status?.type ?? {};
  const boxPlayers: Json[] = json.boxscore?.players ?? [];

  const buildTeam = (c: Json): BoxScoreTeam => {
    const teamId = String(c.team?.id ?? '');
    const teamBox = boxPlayers.find((p) => String(p.team?.id ?? '') === teamId);
    const stats: Json = teamBox?.statistics?.[0] ?? {};
    const names: string[] = stats.names ?? stats.labels ?? [];

    const statsRecord = (values: string[]): Record<string, string> => {
      const r: Record<string, string> = {};
      names.forEach((name, i) => { if (values[i] != null) r[name] = values[i]; });
      return r;
    };

    const allPlayers: BoxScorePlayer[] = ((stats.athletes ?? []) as Json[]).map((a) => {
      const athleteId = String(a.athlete?.id ?? '');
      return {
        id: athleteId,
        name: a.athlete?.displayName ?? '',
        shortName: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
        jersey: a.athlete?.jersey,
        position: a.athlete?.position?.abbreviation,
        headshot: athleteId ? `https://a.espncdn.com/i/headshots/nba/players/full/${athleteId}.png` : undefined,
        starter: a.starter === true,
        didNotPlay: a.didNotPlay === true,
        stats: statsRecord((a.stats ?? []) as string[]),
      };
    });

    const totalsRaw: string[] = (stats.totals ?? []) as string[];

    return {
      team: normalizeTeam(c.team ?? {}),
      homeAway: c.homeAway === 'home' ? 'home' : 'away',
      score: parseFloat(String(c.score ?? '0')) || 0,
      linescores: ((c.linescores ?? []) as Json[]).map((l) => {
        if (typeof l === 'number') return l;
        // ESPN returns {displayValue: "22"} — no "value" field in some responses
        const raw = l.displayValue ?? l.value;
        const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '0'), 10);
        return isNaN(n) ? 0 : n;
      }),
      starters: allPlayers.filter((p) => p.starter && !p.didNotPlay),
      bench: allPlayers.filter((p) => !p.starter && !p.didNotPlay),
      totals: statsRecord(totalsRaw),
      columnNames: names,
      timeoutsRemaining: typeof c.timeoutsRemaining === 'number' ? c.timeoutsRemaining : undefined,
      fouls:
        c.fouls && typeof c.fouls.teamFouls === 'number'
          ? {
              team: c.fouls.teamFouls,
              period: Number(c.fouls.teamFoulsCurrent ?? 0),
              toGive: Number(c.fouls.foulsToGive ?? 0),
              bonus: !!c.fouls.bonusState && c.fouls.bonusState !== 'NONE',
            }
          : undefined,
    };
  };

  const homeC = competitors.find((c) => c.homeAway === 'home') ?? competitors[0] ?? {};
  const awayC = competitors.find((c) => c.homeAway === 'away') ?? competitors[1] ?? {};

  const plays: Play[] = ((json.plays ?? []) as Json[]).map((p) => ({
    id: String(p.id ?? ''),
    period: Number(p.period?.number ?? 1),
    clockText: String(p.clock?.displayValue ?? '0:00'),
    text: String(p.text ?? ''),
    typeText: String(p.type?.text ?? ''),
    teamId: p.team?.id != null ? String(p.team.id) : undefined,
    homeScore: Number(p.homeScore ?? 0),
    awayScore: Number(p.awayScore ?? 0),
    scoring: p.scoringPlay === true,
    scoreValue: Number(p.scoreValue ?? 0),
    shooting: p.shootingPlay === true,
    pointsAttempted: Number(p.pointsAttempted ?? 0),
    athleteIds: ((p.participants ?? []) as Json[])
      .map((x) => String(x.athlete?.id ?? ''))
      .filter(Boolean),
    // ESPN uses ±2^31 sentinels when a play has no location
    x: typeof p.coordinate?.x === 'number' && Math.abs(p.coordinate.x) < 1000 ? p.coordinate.x : undefined,
    y: typeof p.coordinate?.y === 'number' && Math.abs(p.coordinate.y) < 1000 ? p.coordinate.y : undefined,
  }));

  const winProb: Record<string, number> = {};
  for (const w of (json.winprobability ?? []) as Json[]) {
    if (w.playId != null && typeof w.homeWinPercentage === 'number') {
      winProb[String(w.playId)] = w.homeWinPercentage;
    }
  }

  const venue: Json = json.gameInfo?.venue ?? {};
  const info: GameInfo = {
    venue: venue.fullName,
    city: [venue.address?.city, venue.address?.state].filter(Boolean).join(', ') || undefined,
    attendance: typeof json.gameInfo?.attendance === 'number' && json.gameInfo.attendance > 0
      ? json.gameInfo.attendance
      : undefined,
    officials: ((json.gameInfo?.officials ?? []) as Json[])
      .map((o) => String(o.displayName ?? o.fullName ?? ''))
      .filter(Boolean),
    broadcast: json.broadcasts?.[0]?.media?.shortName ?? json.broadcasts?.[0]?.station,
    date: comp.date ?? json.header?.competitions?.[0]?.date,
    seriesSummary: json.seasonseries?.[0]?.summary,
    injuries: ((json.injuries ?? []) as Json[]).flatMap((t) =>
      ((t.injuries ?? []) as Json[]).map((i): Injury => ({
        teamId: String(t.team?.id ?? ''),
        athleteId: String(i.athlete?.id ?? ''),
        name: i.athlete?.displayName ?? '',
        position: i.athlete?.position?.abbreviation,
        headshot: i.athlete?.headshot?.href,
        status: String(i.status ?? i.type?.description ?? ''),
        detail: i.details?.type,
        returnDate: i.details?.returnDate,
      })),
    ),
  };

  return {
    id: gameId,
    status:
      statusType.state === 'in'
        ? statusType.shortDetail ?? statusType.detail ?? 'Live'
        : statusType.description ?? statusType.shortDetail ?? '',
    cup: cupStage(json.header?.gameNote),
    completed: statusType.completed === true,
    live: statusType.state === 'in',
    home: buildTeam(homeC),
    away: buildTeam(awayC),
    plays,
    winProb,
    info,
  };
}

// ─── Scoreboard by date ───────────────────────────────────────────────────────

export type ScoreboardTeam = {
  teamId: string;
  name: string;
  abbreviation: string;
  logo: string;
  score?: number;
  winner?: boolean;
};

export type ScoreboardGame = {
  id: string;
  date: string;
  status: string;
  completed: boolean;
  inProgress: boolean;
  home: ScoreboardTeam;
  away: ScoreboardTeam;
  /** NBA Cup stage when the game is part of the Cup. */
  cup?: string;
};

export async function fetchScoreboardByDate(date: string): Promise<ScoreboardGame[]> {
  // date format: YYYYMMDD
  const json = await getJson(`${BASE}/scoreboard?dates=${date}&limit=20`);
  const events: Json[] = json.events ?? [];
  return events.map((ev) => {
    const comp: Json = ev.competitions?.[0] ?? {};
    const status: Json = comp.status?.type ?? {};
    const competitors: Json[] = comp.competitors ?? [];

    const parseTeam = (c: Json): ScoreboardTeam => ({
      teamId: String(c.team?.id ?? ''),
      name: c.team?.displayName ?? c.team?.name ?? '',
      abbreviation: c.team?.abbreviation ?? '',
      logo: c.team?.logo ?? c.team?.logos?.[0]?.href ?? '',
      score: c.score != null ? parseFloat(String(c.score)) || undefined : undefined,
      winner: c.winner === true,
    });

    const home = parseTeam(competitors.find((c) => c.homeAway === 'home') ?? competitors[0] ?? {});
    const away = parseTeam(competitors.find((c) => c.homeAway === 'away') ?? competitors[1] ?? {});

    return {
      id: String(ev.id ?? ''),
      date: String(ev.date ?? ''),
      status: status.shortDetail ?? status.description ?? '',
      completed: status.completed === true,
      inProgress: status.state === 'in' || status.name === 'STATUS_IN_PROGRESS',
      home,
      away,
      cup: cupStage(comp.notes?.[0]?.headline),
    };
  });
}

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

// ─── Player game log ──────────────────────────────────────────────────────────

export type GameLogEntry = {
  gameId: string;
  date: string;
  home: boolean;
  opponentId: string;
  opponent: string;
  opponentLogo: string;
  result?: 'W' | 'L';
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
  const regular: Json =
    (json.seasonTypes ?? []).find((s: Json) => /regular/i.test(String(s.displayName))) ?? json.seasonTypes?.[0] ?? {};

  const entries: GameLogEntry[] = [];
  for (const cat of (regular.categories ?? []) as Json[]) {
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
      });
    }
  }
  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Player search ────────────────────────────────────────────────────────────

export type PlayerSearchResult = {
  id: string;
  name: string;
  teamId?: string;
  teamAbbr?: string;
  headshot: string;
};

export const headshotUrl = (athleteId: string) =>
  `https://a.espncdn.com/i/headshots/nba/players/full/${athleteId}.png`;

export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const q = encodeURIComponent(query.trim());
  const json = await getJson(
    `https://site.web.api.espn.com/apis/common/v3/search?query=${q}&limit=12&type=player&sport=basketball&league=nba`,
  );
  return ((json.items ?? []) as Json[])
    .filter((i) => i.league === 'nba')
    .map((i) => {
      const core: Json = i.teamRelationships?.[0]?.core ?? {};
      return {
        id: String(i.id),
        name: i.displayName ?? '',
        teamId: core.id != null ? String(core.id) : undefined,
        teamAbbr: core.abbreviation,
        headshot: headshotUrl(String(i.id)),
      };
    });
}

/** Does this scoreboard game involve the team? */
export const involvesTeam = (g: ScoreboardGame, teamId?: string | null) =>
  !!teamId && (g.home.teamId === teamId || g.away.teamId === teamId);

// ─── Player career ────────────────────────────────────────────────────────────

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
      logo: team?.logos?.[0]?.href,
      stats,
    };
  });
  const career: Record<string, string> = {};
  labels.forEach((label, i) => { career[label] = String(averages?.totals?.[i] ?? ''); });
  return { seasons, career };
}

// ─── Player honors, contract, draft ───────────────────────────────────────────

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

  let parsed: Contract | undefined;
  if (contract.status === 'fulfilled' && typeof contract.value.salary === 'number' && contract.value.active !== false) {
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

// ─── League team stats ────────────────────────────────────────────────────────

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


// ─── Tagged games: NBA Cup, playoffs, play-in ────────────────────────────────

export type CupSide = { teamId: string; abbr: string; logo: string; score?: number };

/**
 * One game seen from neither team's side. `stage` is the Cup stage for Cup games ("Group Play"...) and
 * ESPN's full note for playoff and play-in games ("West 1st Round - Game 3").
 */
export type CupGame = {
  id: string;
  date: string;
  stage: string;
  completed: boolean;
  home: CupSide;
  away: CupSide;
};

/**
 * ESPN has no feed for Cup standings or brackets, but every Cup, play-in and playoff game carries a note,
 * and team schedules include games still to come. Reading the schedules and keeping the tagged games
 * rebuilds the whole event (the groups and brackets are built in src/lib/cup.ts and src/lib/bracket.ts).
 */
async function fetchTaggedGames(
  teams: Team[],
  opts: { season?: number; seasonType?: number },
  stageOf: (g: Game) => string | undefined,
): Promise<CupGame[]> {
  const schedules = await Promise.all(teams.map((t) => fetchTeamSchedule(t.id, opts).catch(() => [] as Game[])));
  const byId = new Map<string, CupGame>();
  teams.forEach((team, i) => {
    for (const g of schedules[i]) {
      const stage = stageOf(g);
      if (!stage || byId.has(g.id)) continue;
      const mine: CupSide = { teamId: team.id, abbr: team.abbreviation, logo: team.logoDark || team.logo, score: g.teamScore };
      const theirs: CupSide = { teamId: g.opponentId, abbr: g.opponentAbbr, logo: g.opponentLogo, score: g.opponentScore };
      byId.set(g.id, { id: g.id, date: g.date, stage, completed: g.completed, home: g.home ? mine : theirs, away: g.home ? theirs : mine });
    }
  });
  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchCupGames(season: number = currentSeason()): Promise<CupGame[]> {
  const teams = await fetchTeams();
  return fetchTaggedGames(teams, { season: season === currentSeason() ? undefined : season }, (g) => g.cup);
}

export type Postseason = {
  /** Playoff games, `stage` = ESPN's note. */
  playoffs: CupGame[];
  /** Play-in games, `stage` = ESPN's note. */
  playIn: CupGame[];
  standings: ConferenceStandings;
};

/** Only the ten teams per conference that can reach the postseason are asked for their schedules. */
export async function fetchPostseason(season: number): Promise<Postseason> {
  const [teams, standings] = await Promise.all([fetchTeams(), fetchStandings(season)]);
  const contenders = new Set([...standings.east, ...standings.west].filter((e) => e.seed <= 10).map((e) => e.teamId));
  const pool = contenders.size >= 16 ? teams.filter((t) => contenders.has(t.id)) : teams;
  const [playoffs, playIn] = await Promise.all([
    fetchTaggedGames(pool, { season, seasonType: 3 }, (g) => g.note),
    fetchTaggedGames(pool, { season, seasonType: 5 }, (g) => g.note),
  ]);
  return { playoffs, playIn, standings };
}
