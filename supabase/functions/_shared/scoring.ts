// Pure scoring logic shared by the edge functions and their tests. No Deno or Node imports: it must load in both.
// Mirrors src/lib/league/pickem.ts (the app's own rules); supabase/tests/scoring.test.ts holds the two to the same answers.

/** Kinds of game that can be picked (an All-Star or preseason game is in no table). Same list as the app's PICKABLE_KINDS and the SQL is_pickable_kind. */
const PICKABLE_KINDS = ['regular', 'playoffs', 'playin', 'cup-group', 'cup-knockout'];

export const isPickableKind = (kind: string): boolean => PICKABLE_KINDS.includes(kind);

export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled';

/** ESPN's status of a game as ours: from `competition.status.type` (name, state "pre" / "in" / "post", completed). */
export function classifyStatus(name: unknown, state: unknown, completed: unknown): GameStatus {
  const n = typeof name === 'string' ? name : '';
  if (completed === true || n === 'STATUS_FINAL') return 'final';
  if (n === 'STATUS_POSTPONED' || n === 'STATUS_SUSPENDED') return 'postponed';
  if (n === 'STATUS_CANCELED' || n === 'STATUS_CANCELLED' || n === 'STATUS_FORFEIT') return 'canceled';
  if (n === 'STATUS_SCHEDULED' || state === 'pre') return 'scheduled';
  if (state === 'in' || n === 'STATUS_IN_PROGRESS' || n === 'STATUS_HALFTIME' || n === 'STATUS_END_PERIOD' || n === 'STATUS_DELAYED') return 'in_progress';
  return 'scheduled';
}

/** The winner of a finished game from its score; none while level (a game that is not over). Same as the app's winnerFromScores. */
export function winnerFromScores(away: { id: string; score?: number | null }, home: { id: string; score?: number | null }): string | undefined {
  if (away.score == null || home.score == null || away.score === home.score) return undefined;
  return away.score > home.score ? away.id : home.id;
}

/** A game as the settle function sees it: what ESPN says now. */
export type IncomingGame = {
  id: string;
  status: GameStatus;
  awayId: string;
  homeId: string;
  awayScore?: number | null;
  homeScore?: number | null;
  /** ESPN's own winner flag, when it sets one. */
  winnerId?: string;
};

/** What the database held before this run (a row of `games`), if the game was known. */
export type StoredGame = {
  status: GameStatus;
  winnerTeamId?: string | null;
  settledAt?: string | null;
};

export type Decision =
  | { kind: 'none' }
  | { kind: 'settle'; winnerId: string }
  | { kind: 'void'; as: 'postponed' | 'canceled' }
  | { kind: 'reopen' };

/**
 * What to do about a game, given what ESPN says now and what was stored. Idempotent by construction: a game already in the state ESPN
 * reports gives `none`, so a run every few minutes only touches the SQL functions when something changed.
 *   final       -> settle with the winner (ESPN's flag, else the higher score); again if ESPN corrected the winner; none if no winner can be told
 *   postponed / canceled -> void the picks, once (a game that was never stored has no picks to void)
 *   scheduled again after a postponement -> reopen (the picks count again)
 */
export function decideSettlement(stored: StoredGame | undefined, incoming: IncomingGame): Decision {
  if (incoming.status === 'final') {
    const winnerId =
      incoming.winnerId && [incoming.awayId, incoming.homeId].includes(incoming.winnerId)
        ? incoming.winnerId
        : winnerFromScores({ id: incoming.awayId, score: incoming.awayScore }, { id: incoming.homeId, score: incoming.homeScore });
    if (!winnerId) return { kind: 'none' };
    if (stored && stored.status === 'final' && stored.settledAt && stored.winnerTeamId === winnerId) return { kind: 'none' };
    return { kind: 'settle', winnerId };
  }
  if (incoming.status === 'postponed' || incoming.status === 'canceled') {
    if (!stored || stored.status === incoming.status) return { kind: 'none' };
    return { kind: 'void', as: incoming.status };
  }
  if (incoming.status === 'scheduled' && stored && (stored.status === 'postponed' || stored.status === 'canceled')) return { kind: 'reopen' };
  return { kind: 'none' };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// The leaderboard, in JavaScript: a reference for the SQL function public.leaderboard(), and what the tests compare with the app's own maths.
// ---------------------------------------------------------------------------------------------------------------------------------------

export type SettledPick = {
  gameId: string;
  /** Tip-off, ms since the epoch. */
  tipOff: number;
  teamId: string;
  favoriteId?: string | null;
  winnerId: string;
};

export type UserSummary = {
  wins: number;
  losses: number;
  accuracy: number | null;
  streak: { kind: 'W' | 'L'; length: number } | null;
  bestStreak: number;
  versus: { games: number; you: number; favorite: number };
  upsets: number;
};

/** summarizePicks over picks that have a result, ordered as the SQL orders them: tip-off, then game id. */
export function summarizeUser(picks: SettledPick[]): UserSummary {
  const settled = [...picks].sort((a, b) => a.tipOff - b.tipOff || (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0));
  let wins = 0;
  let best = 0;
  let run = 0;
  let upsets = 0;
  const versus = { games: 0, you: 0, favorite: 0 };
  for (const p of settled) {
    const win = p.winnerId === p.teamId;
    if (win) {
      wins++;
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    if (p.favoriteId) {
      versus.games++;
      if (win) versus.you++;
      if (p.winnerId === p.favoriteId) versus.favorite++;
      if (win && p.teamId !== p.favoriteId) upsets++;
    }
  }
  let streak: UserSummary['streak'] = null;
  const last = settled[settled.length - 1];
  if (last) {
    const kind = last.winnerId === last.teamId ? 'W' : 'L';
    let length = 0;
    for (let i = settled.length - 1; i >= 0 && (settled[i]!.winnerId === settled[i]!.teamId) === (kind === 'W'); i--) length++;
    streak = { kind, length };
  }
  return {
    wins,
    losses: settled.length - wins,
    accuracy: settled.length ? wins / settled.length : null,
    streak,
    bestStreak: best,
    versus,
    upsets,
  };
}

export type BoardEntry = UserSummary & { username: string; rank: number };

/**
 * Ranks players like the SQL: most wins, then best accuracy (null last); equal on both share a rank (1, 2, 2, 4); listed best streak
 * first, then by username (case-insensitive).
 */
export function rankPlayers(players: { username: string; summary: UserSummary }[]): BoardEntry[] {
  const key = (p: { summary: UserSummary }) => [p.summary.wins, p.summary.accuracy ?? -1] as const;
  const sorted = [...players].sort((a, b) => {
    const [aw, aa] = key(a);
    const [bw, ba] = key(b);
    return bw - aw || ba - aa || b.summary.bestStreak - a.summary.bestStreak || a.username.toLowerCase().localeCompare(b.username.toLowerCase());
  });
  return sorted.map((p) => {
    const [w, a] = key(p);
    const ahead = sorted.filter((o) => {
      const [ow, oa] = key(o);
      return ow > w || (ow === w && oa > a);
    }).length;
    return { username: p.username, rank: ahead + 1, ...p.summary };
  });
}
