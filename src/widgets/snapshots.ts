import type { Game, GameLogEntry, Team, TeamDetail } from '@/lib/espn';
import type { FixturesProps } from './fixtures-widget';
import type { LockScreenProps } from './lock-screen-widget';
import type { FormGameProps, TeamFormProps } from './team-form-widget';
import type { WatchlistGameProps, WatchlistPlayerProps, WatchlistProps } from './watchlist-widget';

type Theme = { background: string; surface: string; accent: string };
type TeamLike = Pick<Team, 'abbreviation' | 'name' | 'logo' | 'logoDark'>;

/** A game counts as upcoming until about this long after tip-off. */
const GAME_LENGTH_MS = 3 * 60 * 60 * 1000;
const FORM_GAMES = 5;
export const FIXTURES_SHOWN = 5;

/** "W3" or "L2" from results newest first; empty with no results. */
export function streakOf(resultsNewestFirst: ('W' | 'L')[]): string {
  if (resultsNewestFirst.length === 0) return '';
  const first = resultsNewestFirst[0];
  let n = 0;
  while (n < resultsNewestFirst.length && resultsNewestFirst[n] === first) n++;
  return `${first}${n}`;
}

/** Pure: the last five finished games, record, streak and standing. */
export function buildFormProps(team: TeamLike, detail: Pick<TeamDetail, 'record' | 'standing'> | undefined, schedule: Game[], theme: Theme): TeamFormProps {
  const played = schedule
    .filter((g) => g.completed && g.result && typeof g.teamScore === 'number' && typeof g.opponentScore === 'number')
    .sort((a, b) => b.date.localeCompare(a.date));
  const games: FormGameProps[] = played
    .slice(0, FORM_GAMES)
    .reverse()
    .map((g) => ({ result: g.result as 'W' | 'L', opp: g.opponentAbbr, score: `${g.teamScore}-${g.opponentScore}`, home: g.home }));
  return {
    teamAbbr: team.abbreviation,
    teamName: team.name,
    record: detail?.record ?? '',
    standing: detail?.standing ?? '',
    streak: streakOf(played.map((g) => g.result as 'W' | 'L')),
    bg: theme.background,
    bg2: theme.surface,
    accent: theme.accent,
    logo: team.logoDark || team.logo || '',
    games,
  };
}

/** Pure: the next games, soonest first, with their day and time already formatted. */
export function buildFixturesProps(team: TeamLike, schedule: Game[], theme: Theme, now: Date = new Date()): FixturesProps {
  const upcoming = schedule
    .filter((g) => !g.completed && g.date && Date.parse(g.date) + GAME_LENGTH_MS > now.getTime())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, FIXTURES_SHOWN);
  return {
    teamAbbr: team.abbreviation,
    bg: theme.background,
    bg2: theme.surface,
    accent: theme.accent,
    logo: team.logoDark || team.logo || '',
    games: upcoming.map((g) => ({
      oppAbbr: g.opponentAbbr,
      oppName: g.opponent,
      oppLogo: g.opponentLogo,
      home: g.home,
      day: new Date(g.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      time: new Date(g.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      tag: g.cup ? 'NBA Cup' : '',
      gameId: g.id,
    })),
  };
}

/** Pure: what the Lock Screen widget needs: record and streak, the last five results, the latest score and the next game. */
export function buildLockProps(team: TeamLike, detail: Pick<TeamDetail, 'record'> | undefined, schedule: Game[], now: Date = new Date()): LockScreenProps {
  const played = schedule
    .filter((g) => g.completed && g.result && typeof g.teamScore === 'number' && typeof g.opponentScore === 'number')
    .sort((a, b) => b.date.localeCompare(a.date));
  const next = schedule
    .filter((g) => !g.completed && g.date && Date.parse(g.date) + GAME_LENGTH_MS > now.getTime())
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const latest = played[0];
  const tip = next ? new Date(next.date) : undefined;
  return {
    teamAbbr: team.abbreviation,
    record: detail?.record ?? '',
    streak: streakOf(played.map((g) => g.result as 'W' | 'L')),
    form: played
      .slice(0, FORM_GAMES)
      .reverse()
      .map((g) => g.result as string),
    last: latest ? `${latest.result} ${latest.teamScore}-${latest.opponentScore} ${latest.home ? 'vs' : '@'} ${latest.opponentAbbr}` : '',
    oppAbbr: next?.opponentAbbr ?? '',
    home: next?.home ?? true,
    when: tip ? `${tip.toLocaleDateString(undefined, { weekday: 'short' })} ${tip.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : '',
    time: tip ? tip.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '',
    gameId: next?.id ?? '',
  };
}

export const WATCHLIST_ROWS = 4;

type WatchedGameLike = { id: string; date: string; away: { abbr: string; logo: string }; home: { abbr: string; logo: string } };

/** ESPN's headshot for an athlete id (the same file the app shows). */
const headshotOf = (id: string) => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
type SummaryLike = { live: boolean; completed: boolean; status: string; away: { score: number }; home: { score: number } };

/**
 * Pure: the starred games and players as the Watchlist widget shows them. Logos and headshots are still URLs here; `syncWatchlistWidget`
 * swaps them for files in the shared widget folder. Games: live first, then the ones still to come
 * (soonest first), then the finished (latest first). Players: the starred order, each with his latest game from his log
 * (newest first); one without a log yet is left out.
 */
export function buildWatchlistProps(
  players: { id: string; name: string }[],
  logs: Record<string, GameLogEntry[] | undefined>,
  games: WatchedGameLike[],
  summaries: Record<string, SummaryLike | undefined>,
): WatchlistProps {
  const rank = (s: SummaryLike | undefined) => (s?.live ? 0 : s?.completed ? 2 : 1);
  const rows = games
    .map((g) => ({ g, s: summaries[g.id] }))
    .sort((a, b) => rank(a.s) - rank(b.s) || (rank(a.s) === 2 ? b.g.date.localeCompare(a.g.date) : a.g.date.localeCompare(b.g.date)))
    .slice(0, WATCHLIST_ROWS)
    .map(({ g, s }): WatchlistGameProps => {
      const started = !!s && (s.live || s.completed);
      return {
        away: g.away.abbr,
        home: g.home.abbr,
        awayLogo: g.away.logo,
        homeLogo: g.home.logo,
        awayScore: started ? String(s.away.score) : '',
        homeScore: started ? String(s.home.score) : '',
        status: started
          ? s.status
          : g.date
            ? `${new Date(g.date).toLocaleDateString(undefined, { weekday: 'short' })} ${new Date(g.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
            : '',
        live: !!s?.live,
      };
    });
  const lines = players.flatMap((p): WatchlistPlayerProps[] => {
    const last = logs[p.id]?.[0];
    if (!last) return [];
    return [
      {
        name: p.name,
        avatar: headshotOf(p.id),
        line: `${last.pts} pts · ${last.reb} reb · ${last.ast} ast`,
        result: last.result ? `${last.result} ${last.teamScore}-${last.opponentScore}` : '',
      },
    ];
  });
  return { games: rows, players: lines.slice(0, WATCHLIST_ROWS) };
}
