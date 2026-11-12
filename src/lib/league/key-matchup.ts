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

/**
 * The game's key matchup: players of the same position, as high up each team's ranking as they get. `away` and `home` are the teams'
 * players best first (by ESPN's rating); anyone ruled out by an injury is skipped, a day-to-day player stays, flagged. Every pair in the same
 * group (guards, forwards, centers) is scored by its two places in the rankings (the lower the better), ties going to the pair that scores
 * more. With no same-position pair among them the two best players are matched anyway (`group` null). Null when a team has nobody left.
 */
export function pickKeyMatchup(away: TeamStar[], home: TeamStar[], injuries: Injury[] = [], depth = 6): KeyMatchup | null {
  const status = new Map(injuries.map((i) => [i.athleteId, i.status]));
  const available = (list: TeamStar[]) => list.filter((p) => !isOut(status.get(p.athleteId) ?? '')).slice(0, depth);
  const a = available(away);
  const h = available(home);
  if (a.length === 0 || h.length === 0) return null;
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
  const [i, j] = best ? [best.i, best.j] : [0, 0];
  return {
    away: a[i],
    home: h[j],
    group: best ? positionGroup(a[i].position) : null,
    awayStatus: flagged(a[i]),
    homeStatus: flagged(h[j]),
  };
}
