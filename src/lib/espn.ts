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

async function getJson(url: string): Promise<Json> {
  const res = await fetch(url);
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
    logoDark: pickLogo(t.logos, 'dark') || logo,
  };
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
  teamScore?: number;
  opponentScore?: number;
  completed: boolean;
  result?: 'W' | 'L';
};

export async function fetchTeamSchedule(teamId: string): Promise<Game[]> {
  const json = await getJson(`${BASE}/teams/${teamId}/schedule`);
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
};

function currentSeason(): number {
  const now = new Date();
  return now.getFullYear() + (now.getMonth() >= 9 ? 1 : 0);
}

const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';

export async function fetchLeagueLeaders(): Promise<LeagueLeaders> {
  const season = currentSeason();
  const json = await getJson(`${CORE}/seasons/${season}/types/2/leaders?limit=10&lang=en&region=us`);
  const cats: Json[] = json.categories ?? [];

  const CAT_NAMES = ['pointsPerGame', 'reboundsPerGame', 'assistsPerGame'] as const;

  type RawEntry = { ref: string; teamRef: string; value: number; displayValue: string };
  const rawByCategory: Record<string, RawEntry[]> = {};
  const allAthleteRefs = new Set<string>();

  for (const name of CAT_NAMES) {
    const cat = cats.find((c) => c.name === name);
    const leaders = ((cat?.leaders ?? []) as Json[]).slice(0, 10);
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

  return {
    ppg: buildEntries('pointsPerGame'),
    rpg: buildEntries('reboundsPerGame'),
    apg: buildEntries('assistsPerGame'),
  };
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
};

export type ConferenceStandings = {
  east: StandingEntry[];
  west: StandingEntry[];
};

export async function fetchStandings(): Promise<ConferenceStandings> {
  const json = await getJson(
    'https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&type=0&level=3'
  );
  const conferences: Json[] = json.children ?? [];

  const parseConference = (conf: Json): StandingEntry[] => {
    const entries: Json[] = (conf.children ?? []).flatMap(
      (div: Json) => div.standings?.entries ?? []
    );
    return entries
      .map((e) => {
        const team = e.team ?? {};
        const stats: Json[] = e.stats ?? [];
        const stat = (name: string): number => (stats.find((s) => s.name === name)?.value ?? 0) as number;
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
        };
      })
      .filter((e) => e.seed > 0)
      .sort((a, b) => a.seed - b.seed);
  };

  const east = conferences.find((c) => String(c.name ?? '').includes('Eastern') || c.id === '5');
  const west = conferences.find((c) => String(c.name ?? '').includes('Western') || c.id === '6');

  return {
    east: east ? parseConference(east) : [],
    west: west ? parseConference(west) : [],
  };
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
};

export type GameSummary = {
  id: string;
  status: string;
  completed: boolean;
  home: BoxScoreTeam;
  away: BoxScoreTeam;
};

export async function fetchGameSummary(gameId: string): Promise<GameSummary> {
  const json = await getJson(`${BASE}/summary?event=${gameId}`);
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

    const allPlayers: BoxScorePlayer[] = ((stats.athletes ?? []) as Json[]).map((a) => ({
      id: String(a.athlete?.id ?? ''),
      name: a.athlete?.displayName ?? '',
      shortName: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
      jersey: a.athlete?.jersey,
      position: a.athlete?.position?.abbreviation,
      starter: a.starter === true,
      didNotPlay: a.didNotPlay === true,
      stats: statsRecord((a.stats ?? []) as string[]),
    }));

    const totalsRaw: string[] = (stats.totals ?? []) as string[];

    return {
      team: normalizeTeam(c.team ?? {}),
      homeAway: c.homeAway === 'home' ? 'home' : 'away',
      score: parseFloat(String(c.score ?? '0')) || 0,
      linescores: ((c.linescores ?? []) as Json[]).map((l) => Number(l.value ?? 0)),
      starters: allPlayers.filter((p) => p.starter && !p.didNotPlay),
      bench: allPlayers.filter((p) => !p.starter && !p.didNotPlay),
      totals: statsRecord(totalsRaw),
      columnNames: names,
    };
  };

  const homeC = competitors.find((c) => c.homeAway === 'home') ?? competitors[0] ?? {};
  const awayC = competitors.find((c) => c.homeAway === 'away') ?? competitors[1] ?? {};

  return {
    id: gameId,
    status: statusType.description ?? statusType.shortDetail ?? '',
    completed: statusType.completed === true,
    home: buildTeam(homeC),
    away: buildTeam(awayC),
  };
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
    return {
      gamesPlayed: stat('gamesPlayed'),
      gamesStarted: stat('gamesStarted'),
      ppg: stat('avgPoints'),
      rpg: stat('avgRebounds'),
      apg: stat('avgAssists'),
      spg: stat('avgSteals'),
      bpg: stat('avgBlocks'),
      mpg: stat('avgMinutes'),
      fgPct: stat('fieldGoalPct'),
      threePct: stat('threePointFieldGoalPct'),
      ftPct: stat('freeThrowPct'),
    };
  } catch {
    return {};
  }
}
