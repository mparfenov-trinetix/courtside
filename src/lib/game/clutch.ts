import type { Play } from '../espn';

/** Clutch time: the last five minutes of the fourth quarter or overtime, with the game within five points. */
export const CLUTCH_SECONDS = 300;
export const CLUTCH_MARGIN = 5;

export type ClutchLine = {
  playerId: string;
  teamId: string;
  pts: number;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
};

/** "4:43" -> 283, "38.2" -> 38.2 (ESPN shows seconds with a decimal inside the last minute). */
export function clockSeconds(text: string): number {
  const m = /^(\d+):(\d+)(?:\.\d+)?$/.exec(text.trim());
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const s = parseFloat(text);
  return Number.isNaN(s) ? Number.POSITIVE_INFINITY : s;
}

const isFreeThrow = (p: Play) => p.pointsAttempted === 1;

/**
 * Who scored in clutch time of one game, from its play-by-play: each shot (and free throw) taken while it was the last five
 * minutes of the 4th or overtime with the margin at five or less before the shot. The shooter is the play's first athlete.
 */
export function clutchLines(plays: Play[]): ClutchLine[] {
  const by = new Map<string, ClutchLine>();
  let awayBefore = 0;
  let homeBefore = 0;
  for (const p of plays) {
    const margin = Math.abs(awayBefore - homeBefore);
    if (p.period >= 4 && clockSeconds(p.clockText) <= CLUTCH_SECONDS && margin <= CLUTCH_MARGIN && p.shooting && p.athleteIds[0] && p.teamId) {
      const key = p.athleteIds[0];
      const line = by.get(key) ?? { playerId: key, teamId: p.teamId, pts: 0, fgm: 0, fga: 0, ftm: 0, fta: 0 };
      if (isFreeThrow(p)) {
        line.fta++;
        if (p.scoring) line.ftm++;
      } else {
        line.fga++;
        if (p.scoring) line.fgm++;
      }
      if (p.scoring) line.pts += p.scoreValue;
      by.set(key, line);
    }
    awayBefore = p.awayScore;
    homeBefore = p.homeScore;
  }
  return [...by.values()];
}

/** Several games' lines merged by player, most points first. */
export function clutchBoard(games: ClutchLine[][]): ClutchLine[] {
  const by = new Map<string, ClutchLine>();
  for (const line of games.flat()) {
    const sum = by.get(line.playerId);
    if (!sum) by.set(line.playerId, { ...line });
    else {
      sum.pts += line.pts;
      sum.fgm += line.fgm;
      sum.fga += line.fga;
      sum.ftm += line.ftm;
      sum.fta += line.fta;
    }
  }
  return [...by.values()].sort((a, b) => b.pts - a.pts || b.fgm - a.fgm);
}
