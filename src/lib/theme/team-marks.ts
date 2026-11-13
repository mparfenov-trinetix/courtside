/**
 * ESPN's "secondary logo" per team: a lettered wordmark for five teams, an alternate emblem for the rest.
 * Each image is a square with the artwork centered; `FILL` is the artwork's measured width and height as a
 * fraction of that square, so it can be drawn at an exact size (see TeamMark).
 */
export const WORDMARK_TEAMS = new Set(['PHI', 'PHX', 'POR', 'CLE', 'BKN']);

const MARK_FILL: Record<string, [w: number, h: number]> = {
  ATL: [0.925, 0.783], BOS: [0.925, 0.925], BKN: [0.925, 0.617], CHA: [0.892, 0.921], CHI: [0.917, 0.925],
  CLE: [0.925, 0.55], DAL: [0.925, 0.917], DEN: [0.925, 0.725], DET: [0.925, 0.925], GS: [0.925, 0.558],
  HOU: [0.625, 0.925], IND: [0.642, 0.925], LAC: [0.925, 0.696], LAL: [0.925, 0.775], MEM: [0.925, 0.9],
  MIA: [0.925, 0.575], MIL: [0.925, 0.925], MIN: [0.925, 0.758], NO: [0.8, 0.917], NY: [0.925, 0.925],
  OKC: [0.925, 0.533], ORL: [0.917, 0.867], PHI: [0.925, 0.367], PHX: [0.917, 0.333], POR: [0.925, 0.342],
  SAC: [0.808, 0.921], SA: [0.921, 0.917], TOR: [0.925, 0.917], UTAH: [0.925, 0.917], WSH: [0.725, 0.925],
};

/**
 * Pixel size of the artwork and of the square image that holds it, so that the artwork fits `box`
 * (and no more) whatever its shape.
 */
export function fitMark(abbr: string, box: { w: number; h: number }) {
  const [fw, fh] = MARK_FILL[abbr] ?? [0.9, 0.9];
  const side = Math.min(box.w / fw, box.h / fh);
  return { side, w: side * fw, h: side * fh };
}
