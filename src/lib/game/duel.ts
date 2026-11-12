import type { BoxScorePlayer } from '../espn';

/** A scoring duel: both players scored at least this many... */
export const DUEL_MIN_POINTS = 30;
/** ...and no more than this many points apart (35 against 32, 44 against 39). */
export const DUEL_MAX_GAP = 6;
/** An all-round duel: both players' points, rebounds and assists together at least this much (20 + 10 + 10, 22 + 10 + 8)... */
export const DUEL_MIN_COMBINED = 40;
// ...and no more than the same gap apart.

export type GameDuel = { away: BoxScorePlayer; home: BoxScorePlayer; kind: 'points' | 'allround' };

const num = (v?: string) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : 0);
export const pointsOf = (p: BoxScorePlayer) => num(p.stats.PTS);
export const combinedOf = (p: BoxScorePlayer) => num(p.stats.PTS) + num(p.stats.REB) + num(p.stats.AST);

/**
 * A finished game's duel, if it had a real one: two players, one from each team, who matched each other over the game, so the box score reads
 * as a shootout. Either both scored 30 or more and within 6 points of each other (a scoring duel), or both put up 40 or more in points,
 * rebounds and assists together and within 6 of each other (an all-round duel: 20 + 10 + 10 against 22 + 10 + 8). A scoring duel comes first;
 * among several pairs the one whose lesser player did more wins, ties to the bigger total. Position does not matter. Null when there was none.
 */
export function pickGameDuel(away: BoxScorePlayer[], home: BoxScorePlayer[]): GameDuel | null {
  const played = (list: BoxScorePlayer[]) => list.filter((p) => !p.didNotPlay);
  const a = played(away);
  const h = played(home);
  const best = (measure: (p: BoxScorePlayer) => number, floor: number) => {
    let found: { away: BoxScorePlayer; home: BoxScorePlayer; low: number; total: number } | null = null;
    for (const x of a) {
      for (const y of h) {
        const mx = measure(x);
        const my = measure(y);
        if (mx < floor || my < floor || Math.abs(mx - my) > DUEL_MAX_GAP) continue;
        const low = Math.min(mx, my);
        const total = mx + my;
        if (!found || low > found.low || (low === found.low && total > found.total)) found = { away: x, home: y, low, total };
      }
    }
    return found;
  };
  const points = best(pointsOf, DUEL_MIN_POINTS);
  if (points) return { away: points.away, home: points.home, kind: 'points' };
  const allround = best(combinedOf, DUEL_MIN_COMBINED);
  return allround ? { away: allround.away, home: allround.home, kind: 'allround' } : null;
}
