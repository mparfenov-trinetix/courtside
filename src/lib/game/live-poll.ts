/** How close to tip-off a game counts as "about to start", and how long past it a game that has not begun is still waited for. */
const SOON_MS = 20 * 60 * 1000;
const WAIT_MS = 4 * 60 * 60 * 1000;

export type GameClock = { live: boolean; completed: boolean; /** ISO tip-off time. */ date?: string };

/**
 * Where a game is in its day: `live` while it is being played, `soon` from twenty minutes before tip-off until it
 * starts (a game that has not begun by then is waited for up to four hours), `idle` when nothing is about to change.
 * Polling has to start from `soon`, not `live`: a page opened before tip-off would otherwise never learn the game began.
 */
export function gamePhase(game: GameClock, now: number = Date.now()): 'live' | 'soon' | 'idle' {
  if (game.completed) return 'idle';
  if (game.live) return 'live';
  const start = game.date ? Date.parse(game.date.length === 17 ? `${game.date.slice(0, 16)}:00Z` : game.date) : NaN;
  if (Number.isNaN(start)) return 'idle';
  return start - now <= SOON_MS && now - start <= WAIT_MS ? 'soon' : 'idle';
}

/** The busiest phase across a day's games: `live` if any is on, else `soon` if any is about to start, else `idle`. */
export function boardPhase(games: { inProgress: boolean; completed: boolean; date: string }[] | undefined, now: number = Date.now()): 'live' | 'soon' | 'idle' {
  const phases = (games ?? []).map((g) => gamePhase({ live: g.inProgress, completed: g.completed, date: g.date }, now));
  return phases.includes('live') ? 'live' : phases.includes('soon') ? 'soon' : 'idle';
}

/** Whether a game that has not started yet is on the board: the page has to look at the clock again to notice tip-off. */
export const awaitsTipOff = (games: { inProgress: boolean; completed: boolean }[] | undefined) => (games ?? []).some((g) => !g.inProgress && !g.completed);
