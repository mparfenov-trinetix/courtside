import type { Play } from '../espn';

export type PlayerShot = { id: string; x: number; y: number; made: boolean; three: boolean };

// Court geometry in feet (see components/ShotMap/constants): the basket sits at (25, 5.25) and the half court is 47 ft deep.
const HOOP_Y = 5.25;
const COURT_W = 50;
const COURT_H = 47;

/**
 * One player's field goal attempts out of a game's plays, in half-court feet (origin at the baseline's left corner).
 * ESPN measures y from the rim, so it is shifted; free throws and shots without a location are left out.
 */
export function shotsOf(plays: Play[], athleteId: string): PlayerShot[] {
  const out: PlayerShot[] = [];
  for (const p of plays) {
    if (!p.shooting || p.x == null || p.y == null || p.athleteIds[0] !== athleteId) continue;
    if (/^Free Throw/i.test(p.typeText)) continue;
    const y = p.y + HOOP_Y;
    if (y > COURT_H) continue;
    out.push({
      id: p.id,
      x: Math.min(COURT_W, Math.max(0, p.x)),
      y,
      made: p.scoreValue > 0,
      three: p.pointsAttempted === 3,
    });
  }
  return out;
}

