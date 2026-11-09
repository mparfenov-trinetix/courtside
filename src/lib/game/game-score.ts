const made = (value?: string): [number, number] | undefined => {
  const m = /^(\d+)-(\d+)$/.exec((value ?? '').trim());
  return m ? [Number(m[1]), Number(m[2])] : undefined;
};

const count = (value?: string): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** One player's Game Score from his box score line (ESPN's column labels), or undefined for someone who did not play. */
export function gameScore(stats: Record<string, string>): number | undefined {
  const fg = made(stats.FG);
  const ft = made(stats.FT);
  if (!fg || !ft) return undefined;
  const [fgm, fga] = fg;
  const [ftm, fta] = ft;
  return (
    count(stats.PTS) +
    0.4 * fgm -
    0.7 * fga -
    0.4 * (fta - ftm) +
    0.7 * count(stats.OREB) +
    0.3 * count(stats.DREB) +
    count(stats.STL) +
    0.7 * count(stats.AST) +
    0.7 * count(stats.BLK) -
    0.4 * count(stats.PF) -
    count(stats.TO)
  );
}

/** "16.2", "-1.4": one decimal, and "–" for someone with no line. */
export const formatGameScore = (score?: number): string => (score === undefined ? '–' : score.toFixed(1));

/**
 * Game Score on the way to a rating: where a raw score lands on the 1-10 scale, between these points (a straight line from one to the next).
 * 0 (a few points on bad shooting) is already a 5, a typical rotation game (about 10) a 7, a very good one (16) an 8, 25 (a big night) a 9
 * and 38 (40 points, 10 rebounds and 10 assists on good shooting works out at about that) a 10.
 */
export const RATING_POINTS: [score: number, rating: number][] = [
  [-10, 1],
  [-3, 3.5],
  [0, 5],
  [5, 6],
  [10, 7],
  [16, 8],
  [25, 9],
  [38, 10],
];

/** A raw Game Score on the 1-10 scale. */
export function ratingOf(score: number): number {
  const first = RATING_POINTS[0];
  const last = RATING_POINTS[RATING_POINTS.length - 1];
  if (score <= first[0]) return first[1];
  if (score >= last[0]) return last[1];
  for (let i = 1; i < RATING_POINTS.length; i++) {
    const [x1, y1] = RATING_POINTS[i];
    if (score <= x1) {
      const [x0, y0] = RATING_POINTS[i - 1];
      return y0 + ((score - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return last[1];
}

/** A player with fewer minutes than this has no rating: a few minutes of garbage time say nothing (and read as a bad game). */
export const MIN_RATED_MINUTES = 5;

/** The 1-10 rating of a player's whole game, or undefined for someone who did not play (or played under `MIN_RATED_MINUTES`). */
export function gameRating(stats: Record<string, string>): number | undefined {
  const score = gameScore(stats);
  const minutes = parseInt(stats.MIN ?? '', 10);
  if (score === undefined || !Number.isFinite(minutes) || minutes < MIN_RATED_MINUTES) return undefined;
  return ratingOf(score);
}

/** "7.4": one decimal, and "–" for someone with no rating. */
export const formatRating = (rating?: number): string => (rating === undefined ? '–' : rating.toFixed(1));
