import { headshotUrl, type GameLogEntry } from '@/lib/espn';
import { WATCHLIST_GAMES, WATCHLIST_PLAYERS } from './constants';
import type { WatchlistGameProps, WatchlistPlayerProps, WatchlistProps } from './types';

type WatchedGameLike = { id: string; date: string; away: { abbr: string; logo: string }; home: { abbr: string; logo: string } };

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
  /** The two teams' colors for a game, by abbreviation (the card look); without it the colors are left empty. */
  matchupOf?: (away: string, home: string) => { away: string; home: string } | undefined,
): WatchlistProps {
  const rank = (s: SummaryLike | undefined) => (s?.live ? 0 : s?.completed ? 2 : 1);
  const rows = games
    .map((g) => ({ g, s: summaries[g.id] }))
    .sort((a, b) => rank(a.s) - rank(b.s) || (rank(a.s) === 2 ? b.g.date.localeCompare(a.g.date) : a.g.date.localeCompare(b.g.date)))
    .slice(0, WATCHLIST_GAMES)
    .map(({ g, s }): WatchlistGameProps => {
      const started = !!s && (s.live || s.completed);
      const colors = matchupOf?.(g.away.abbr, g.home.abbr);
      return {
        away: g.away.abbr,
        home: g.home.abbr,
        awayLogo: g.away.logo,
        homeLogo: g.home.logo,
        awayColor: colors?.away ?? '',
        homeColor: colors?.home ?? '',
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
        avatar: headshotUrl(p.id),
        line: `${last.pts} pts · ${last.reb} reb · ${last.ast} ast`,
        pts: String(last.pts),
        reb: String(last.reb),
        ast: String(last.ast),
        result: last.result ? `${last.result} ${last.teamScore}-${last.opponentScore}` : '',
      },
    ];
  });
  return { games: rows, players: lines.slice(0, WATCHLIST_PLAYERS) };
}
