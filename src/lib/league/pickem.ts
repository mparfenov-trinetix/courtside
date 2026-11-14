/**
 * Pick'em: you call the winner of an upcoming game before tip-off, and the app keeps score. Pure and tested; the store
 * (`state/pickem-store.tsx`) saves the picks and the screens draw them.
 */

export type PickSide = { id: string; abbr: string; logo: string };

/** The least a pick needs to know about its game, so a pick can be listed before (or without) loading the game itself. */
export type PickableGame = {
  id: string;
  /** ISO start time. */
  date: string;
  away: PickSide;
  home: PickSide;
};

export type GamePick = PickableGame & {
  /** The team picked to win. */
  teamId: string;
  /** When the pick was made (ms). */
  madeAt: number;
  /** Who was favored at that moment (ESPN's win chance, else the book's price); missing when neither was posted. */
  favoriteId?: string;
  /** The winner, once the game is final. */
  winnerId?: string;
};

export type PickResult = 'win' | 'loss' | 'pending';

/** Kinds of game that can be picked: an All-Star game or a preseason game is in no table and is not worth a record. */
const PICKABLE_KINDS = ['regular', 'playoffs', 'playin', 'cup-group', 'cup-knockout'];

export const isPickableKind = (kind: string) => PICKABLE_KINDS.includes(kind);

const startOf = (iso: string) => new Date(iso.replace(/T(\d\d:\d\d)Z$/, 'T$1:00Z')).getTime();

/** A pick is open until tip-off. A date that cannot be read counts as locked: better a missed pick than a late one. */
export function isLocked(iso: string, now: number = Date.now()): boolean {
  const start = startOf(iso);
  return Number.isNaN(start) || now >= start;
}

/** Who ESPN's win chance, or failing that the book's price, makes the favorite; none when the two are level or nothing is posted. */
export function favoriteOf(
  awayId: string,
  homeId: string,
  pregame?: {
    winProb?: { home: number; away: number };
    odds?: { home: { favorite: boolean; decimal?: number }; away: { favorite: boolean; decimal?: number } };
  },
): string | undefined {
  const p = pregame?.winProb;
  if (p && p.home !== p.away) return p.home > p.away ? homeId : awayId;
  const o = pregame?.odds;
  if (!o) return undefined;
  if (o.home.favorite !== o.away.favorite) return o.home.favorite ? homeId : awayId;
  if (o.home.decimal != null && o.away.decimal != null && o.home.decimal !== o.away.decimal) return o.home.decimal < o.away.decimal ? homeId : awayId;
  return undefined;
}

/** The winner of a finished game from its score; none while level (a game that is not over). */
export function winnerFromScores(away: { id: string; score?: number }, home: { id: string; score?: number }): string | undefined {
  if (away.score == null || home.score == null || away.score === home.score) return undefined;
  return away.score > home.score ? away.id : home.id;
}

export function resultOf(pick: GamePick): PickResult {
  if (!pick.winnerId) return 'pending';
  return pick.winnerId === pick.teamId ? 'win' : 'loss';
}

/** Records the winners of the games that have finished; picks of other games are left as they were (same array when nothing changed). */
export function settlePicks(picks: GamePick[], winners: Record<string, string | undefined>): GamePick[] {
  let changed = false;
  const next = picks.map((p) => {
    const winnerId = winners[p.id];
    if (!winnerId || p.winnerId === winnerId) return p;
    changed = true;
    return { ...p, winnerId };
  });
  return changed ? next : picks;
}

/**
 * Picks that have no winner yet and whose game has started: the ones to look up on the scoreboard. It is the scoreboard that says a game is over
 * (`completed`), not a clock: waiting 3.5 hours after the start left a record unchanged for an hour after the final buzzer while the app was open.
 */
export function startedWithoutResult(picks: GamePick[], now: number = Date.now()): GamePick[] {
  return picks.filter((p) => !p.winnerId && now >= startOf(p.date));
}

export type PickSummary = {
  won: number;
  lost: number;
  pending: number;
  /** Won over settled picks, 0..1; null before the first result. */
  accuracy: number | null;
  /** The run you are on (the latest results), null before the first result. */
  streak: { kind: 'W' | 'L'; length: number } | null;
  /** The longest run of right calls. */
  bestStreak: number;
  /** Over the settled games that had a favorite: how you did, and how always taking the favorite would have. */
  versus: { games: number; you: number; favorite: number };
  /** Right calls on an underdog. */
  upsets: number;
};

/** The score card: record, accuracy, the streak, and how it compares to simply backing the favorite every time. */
export function summarizePicks(picks: GamePick[]): PickSummary {
  const settled = picks.filter((p) => p.winnerId).sort((a, b) => startOf(a.date) - startOf(b.date));
  let won = 0;
  let best = 0;
  let run = 0;
  let upsets = 0;
  const versus = { games: 0, you: 0, favorite: 0 };
  for (const p of settled) {
    const win = p.winnerId === p.teamId;
    if (win) {
      won++;
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
  let streak: PickSummary['streak'] = null;
  const last = settled[settled.length - 1];
  if (last) {
    const kind = last.winnerId === last.teamId ? 'W' : 'L';
    let length = 0;
    for (let i = settled.length - 1; i >= 0 && (settled[i].winnerId === settled[i].teamId) === (kind === 'W'); i--) length++;
    streak = { kind, length };
  }
  return {
    won,
    lost: settled.length - won,
    pending: picks.length - settled.length,
    accuracy: settled.length ? won / settled.length : null,
    streak,
    bestStreak: best,
    versus,
    upsets,
  };
}
