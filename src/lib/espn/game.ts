import { BASE, CORE, getJson, HttpError, report } from './client';
import type { Json } from './client';
import { headshotUrl } from './legend-photos';
import { normalizeVideos, type GameVideo } from './video';
import { classifyGame, cupStage, seriesLine, type GameKind } from './common';
import { withEraLogo } from './franchise';
import { normalizeGameRecap, type GameRecap } from './news';
import { normalizeTeam } from './teams';
import type { Team } from './teams';

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

/** One of a team's last five results, from the team's side. */
export type FormGame = {
  id: string;
  date: string;
  result: 'W' | 'L';
  teamScore: number;
  opponentScore: number;
  opponentAbbr: string;
  opponentLogo: string;
  /** Played at home. */
  home: boolean;
};

export type SideOdds = {
  /** American moneyline as the book prints it, e.g. -135 or +114. */
  moneyLine?: number;
  /** The same price as decimal odds (1.74, 2.14). */
  decimal?: number;
  favorite: boolean;
};

export type GameOdds = {
  provider: string;
  /** The book's own spread line, e.g. "DET -1.5". */
  details?: string;
  overUnder?: number;
  home: SideOdds;
  away: SideOdds;
};

/** What ESPN publishes before tip-off. Every part can be missing. */
export type Pregame = {
  /** Home and away win chance in percent (sums to 100). */
  winProb?: { home: number; away: number };
  odds?: GameOdds;
  /** Last five results per team id, oldest first. */
  form: Record<string, FormGame[]>;
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
  pregame: Pregame;
  /** The game's highlight clips (empty until ESPN has cut them). */
  videos: GameVideo[];
  /** ESPN's recap article of a finished game, when it has written one. */
  recap?: GameRecap;
  /** NBA Cup stage when the game is part of the Cup. */
  cup?: string;
  /** Regular season, playoffs, play-in, Cup, All-Star or preseason: decides which table the page links to. */
  kind: GameKind;
  /** The season it belongs to, named by the year it ends in (2026 = 2025-26); undefined when ESPN does not say. */
  season?: number;
  /** ESPN's note for the game ("West Finals - Game 2"). */
  note?: string;
  /** A playoff game's series as it stands after it (or now, for one still to come): "ORL leads 3-2", "NYK won 4-2", "Tied 3-3". */
  series?: string;
};

export async function fetchGameSummary(gameId: string): Promise<GameSummary> {
  const summary = normalizeGameSummary(await getJson(`${BASE}/summary?event=${gameId}`), gameId);
  const started = summary.completed || summary.live;
  const noBox = [...summary.home.starters, ...summary.home.bench, ...summary.away.starters, ...summary.away.bench].length === 0;
  report('game', started && (summary.plays.length === 0 || noBox) ? 'play-by-play or box score missing' : null);
  return summary;
}

/**
 * Just the highlight clips of a game. The summary is one big response (box score, every play); the player and team pages only want the
 * clip list, so this reads it without normalizing the rest, which is most of the work on the JS thread.
 */
export async function fetchGameVideos(gameId: string): Promise<GameVideo[]> {
  return normalizeVideos(await getJson(`${BASE}/summary?event=${gameId}`));
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
        headshot: athleteId ? headshotUrl(athleteId) : undefined,
        starter: a.starter === true,
        didNotPlay: a.didNotPlay === true,
        stats: statsRecord((a.stats ?? []) as string[]),
      };
    });

    const totalsRaw: string[] = (stats.totals ?? []) as string[];

    return {
      // The feed says the name of the day (New Jersey Nets) but files today's emblem under it: the app's own logo of that time is put in its place.
      team: withEraLogo(normalizeTeam(c.team ?? {}), Number(json.header?.season?.year) || undefined),
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
    kind: classifyGame(json.header?.gameNote, json.header?.season?.type),
    season: Number(json.header?.season?.year) || undefined,
    note: typeof json.header?.gameNote === 'string' ? json.header.gameNote : undefined,
    series: seriesLine(((comp.series ?? []) as Json[]).find((s) => s.type === 'playoff')?.summary),
    completed: statusType.completed === true,
    live: statusType.state === 'in',
    home: buildTeam(homeC),
    away: buildTeam(awayC),
    plays,
    winProb,
    info,
    pregame: normalizePregame(json, String(homeC?.team?.id ?? ''), String(awayC?.team?.id ?? '')),
    videos: normalizeVideos(json),
    recap: normalizeGameRecap(json.article),
  };
}

/** American moneyline -> decimal odds. -135 pays 1.74 for 1, +114 pays 2.14. */
export function moneylineToDecimal(ml: number): number {
  const dec = ml > 0 ? 1 + ml / 100 : 1 + 100 / -ml;
  return Math.round(dec * 100) / 100;
}

const pctOf = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** One sportsbook's line, from a `pickcenter` entry of the summary or an item of the core API's `odds` list (the same fields). */
function normalizeOdds(pick: Json | undefined): GameOdds | undefined {
  if (!pick) return undefined;
  const side = (o: Json | undefined): SideOdds => {
    const ml = typeof o?.moneyLine === 'number' ? o.moneyLine : undefined;
    return { moneyLine: ml, decimal: ml != null && ml !== 0 ? moneylineToDecimal(ml) : undefined, favorite: o?.favorite === true };
  };
  return {
    provider: pick.provider?.name ?? 'Sportsbook',
    details: typeof pick.details === 'string' ? pick.details : undefined,
    overUnder: typeof pick.overUnder === 'number' ? pick.overUnder : undefined,
    home: side(pick.homeTeamOdds),
    away: side(pick.awayTeamOdds),
  };
}

/**
 * What ESPN said before tip-off, read after the game: the summary drops its `predictor` and `pickcenter` once a game has started, but the
 * core API keeps them (`.../competitions/{id}/predictor` and `/odds`; the line is the closing one). The predictor lists the statistics of
 * one side only, so the other is the rest of 100.
 */
export function normalizePastPregame(predictor: Json | undefined, odds: Json | undefined): Pick<Pregame, 'winProb' | 'odds'> {
  const projection = (team: Json | undefined) => pctOf(((team?.statistics ?? []) as Json[]).find((s) => s.name === 'gameProjection')?.value);
  const homeP = projection(predictor?.homeTeam);
  const awayP = projection(predictor?.awayTeam);
  const home = homeP ?? (awayP != null ? 100 - awayP : undefined);
  const away = awayP ?? (homeP != null ? 100 - homeP : undefined);
  const items = (odds?.items ?? []) as Json[];
  return {
    winProb: home != null && away != null ? { home, away } : undefined,
    odds: normalizeOdds(items.find((p) => p.homeTeamOdds || p.awayTeamOdds)),
  };
}

/** A finished game's pregame chances and closing line (`normalizePastPregame`); a game ESPN has neither for gives an empty object. */
export async function fetchPastPregame(gameId: string): Promise<Pick<Pregame, 'winProb' | 'odds'>> {
  const read = async (part: string) => {
    try {
      return await getJson(`${CORE}/events/${gameId}/competitions/${gameId}/${part}`);
    } catch (error) {
      if (error instanceof HttpError) return undefined; // not published for this game
      throw error;
    }
  };
  const [predictor, odds] = await Promise.all([read('predictor'), read('odds')]);
  return normalizePastPregame(predictor, odds);
}

function normalizePregame(json: Json, homeId: string, awayId: string): Pregame {
  const homeP = pctOf(json.predictor?.homeTeam?.gameProjection);
  const awayP = pctOf(json.predictor?.awayTeam?.gameProjection);
  const winProb = homeP != null && awayP != null ? { home: homeP, away: awayP } : undefined;

  const odds = normalizeOdds((json.pickcenter ?? []).find((p: Json) => p.homeTeamOdds || p.awayTeamOdds));

  const form: Record<string, FormGame[]> = {};
  for (const t of (json.lastFiveGames ?? []) as Json[]) {
    const teamId = String(t.team?.id ?? '');
    if (!teamId || (teamId !== homeId && teamId !== awayId)) continue;
    form[teamId] = ((t.events ?? []) as Json[])
      .filter((e) => e.gameResult === 'W' || e.gameResult === 'L')
      .map((e): FormGame => {
        const atHome = String(e.homeTeamId) === teamId;
        const mine = Number(atHome ? e.homeTeamScore : e.awayTeamScore);
        const theirs = Number(atHome ? e.awayTeamScore : e.homeTeamScore);
        return {
          id: String(e.id),
          date: e.gameDate ?? '',
          result: e.gameResult,
          teamScore: mine,
          opponentScore: theirs,
          opponentAbbr: e.opponent?.abbreviation ?? '',
          opponentLogo: e.opponent?.logo ?? '',
          home: atHome,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-5);
  }
  return { winProb, odds, form };
}
