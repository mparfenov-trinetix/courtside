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

/** A player makes a key matchup only if he is among his team's best three (by ESPN's rating, once the injured are out) and is a star by the numbers: scores 20 or more... */
export const MATCHUP_RANKS = 3;
export const MATCHUP_MIN_PPG = 20;
/** ...or, under 20, makes it up elsewhere: points, rebounds and assists together adding up to 28 or more (15 points, 6 rebounds and 7 assists). This is the rule that does the work; 18.6 points with 1.8 rebounds and 2.3 assists (22.7) is not a star's line. */
export const MATCHUP_MIN_COMBINED = 28;

/** Is this season line a star's: 20+ points a game, or under that, 28+ points, rebounds and assists together? Lines are ESPN's strings ("18.6"). */
export function isMatchupStar(line: { ppg: string; rpg: string; apg: string }): boolean {
  const n = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return n(line.ppg) >= MATCHUP_MIN_PPG || n(line.ppg) + n(line.rpg) + n(line.apg) >= MATCHUP_MIN_COMBINED;
}

const combined = (p: TeamStar) => Number(p.ppg) + Number(p.rpg) + Number(p.apg);

/**
 * The game's key matchup, if it has a real one: two players of the same position (guards, forwards or centers), each among his team's best
 * three by ESPN's rating and each a star by the numbers (`isMatchupStar`: 20+ points, or under 20 a points, rebounds and assists line adding up to 28+), so it is
 * two stars across from each other and not just the best of whoever is on the floor. `away` and `home` are the teams' players best first; anyone ruled out by an injury is skipped, a day-to-day player stays, flagged.
 * Every qualifying pair in the same group is scored by its two places in the rankings (the lower the better), ties going to the pair with the
 * bigger combined line. Null when no pair qualifies: most games have no such matchup, and then none is shown.
 */
export function pickKeyMatchup(away: TeamStar[], home: TeamStar[], injuries: Injury[] = []): KeyMatchup | null {
  const status = new Map(injuries.map((i) => [i.athleteId, i.status]));
  const stars = (list: TeamStar[]) =>
    list
      .filter((p) => !isOut(status.get(p.athleteId) ?? ''))
      .slice(0, MATCHUP_RANKS)
      .filter(isMatchupStar);
  const a = stars(away);
  const h = stars(home);
  const flagged = (p: TeamStar) => (status.has(p.athleteId) ? 'Day-to-day' : undefined);

  let best: { i: number; j: number; points: number } | null = null;
  for (let i = 0; i < a.length; i++) {
    const g = positionGroup(a[i].position);
    if (!g) continue;
    for (let j = 0; j < h.length; j++) {
      if (positionGroup(h[j].position) !== g) continue;
      const points = combined(a[i]) + combined(h[j]);
      if (!best || i + j < best.i + best.j || (i + j === best.i + best.j && points > best.points)) best = { i, j, points };
    }
  }
  if (!best) return null;
  return { away: a[best.i], home: h[best.j], group: positionGroup(a[best.i].position), awayStatus: flagged(a[best.i]), homeStatus: flagged(h[best.j]) };
}
