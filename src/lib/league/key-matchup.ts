import type { Injury, TeamStar } from '../espn';

export type PositionGroup = 'G' | 'F' | 'C';

/** ESPN's position abbreviation as one of the three groups a matchup is made within: guards, forwards, centers ("PG", "SG", "G"; "SF", "PF", "F"; "C"). */
export function positionGroup(position?: string): PositionGroup | null {
  const p = (position ?? '').toUpperCase();
  if (/^(PG|SG|G)/.test(p)) return 'G';
  if (/^(SF|PF|F)/.test(p)) return 'F';
  if (/^C/.test(p)) return 'C';
  return null;
}

export const GROUP_LABEL: Record<PositionGroup, string> = { G: 'Guards', F: 'Forwards', C: 'Centers' };

export type KeyMatchup = { away: TeamStar; home: TeamStar; group: PositionGroup | null; awayStatus?: string; homeStatus?: string };

/** An injury that rules a player out of the game (a day-to-day one does not: he may play, and is flagged). */
const isOut = (status: string) => /^out/i.test(status.trim());

/** A player makes a key matchup only if he is among his team's best three (by ESPN's rating, once the injured are out) and scores at least this many a game. */
export const MATCHUP_RANKS = 3;
export const MATCHUP_MIN_PPG = 20;

/**
 * The game's key matchup, if it has a real one: two players of the same position (guards, forwards or centers), each among his team's best
 * three by ESPN's rating and each scoring 20 or more a game, so it is two stars across from each other and not just the best of whoever is on
 * the floor. `away` and `home` are the teams' players best first; anyone ruled out by an injury is skipped, a day-to-day player stays, flagged.
 * Every qualifying pair in the same group is scored by its two places in the rankings (the lower the better), ties going to the pair that
 * scores more. Null when no pair qualifies: most games have no such matchup, and then none is shown.
 */
export function pickKeyMatchup(away: TeamStar[], home: TeamStar[], injuries: Injury[] = []): KeyMatchup | null {
  const status = new Map(injuries.map((i) => [i.athleteId, i.status]));
  const stars = (list: TeamStar[]) =>
    list
      .filter((p) => !isOut(status.get(p.athleteId) ?? ''))
      .slice(0, MATCHUP_RANKS)
      .filter((p) => Number(p.ppg) >= MATCHUP_MIN_PPG);
  const a = stars(away);
  const h = stars(home);
  const flagged = (p: TeamStar) => (status.has(p.athleteId) ? 'Day-to-day' : undefined);

  let best: { i: number; j: number; points: number } | null = null;
  for (let i = 0; i < a.length; i++) {
    const g = positionGroup(a[i].position);
    if (!g) continue;
    for (let j = 0; j < h.length; j++) {
      if (positionGroup(h[j].position) !== g) continue;
      const points = Number(a[i].ppg) + Number(h[j].ppg);
      if (!best || i + j < best.i + best.j || (i + j === best.i + best.j && points > best.points)) best = { i, j, points };
    }
  }
  if (!best) return null;
  return { away: a[best.i], home: h[best.j], group: positionGroup(a[best.i].position), awayStatus: flagged(a[best.i]), homeStatus: flagged(h[best.j]) };
}
