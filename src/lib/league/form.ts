import type { GameLogEntry } from '../espn';

/** One game's worth of production in a number: points, boards, passes and stops, less the turnovers. */
const gameImpact = (g: Pick<GameLogEntry, 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'to'>) =>
  g.pts + 1.1 * g.reb + 1.6 * g.ast + 2.2 * g.stl + 1.8 * g.blk - 1.2 * g.to;

export type Form = {
  /** Impact per game over the last `recent` games, and over the games before them. */
  recent: number;
  baseline: number;
  /** recent - baseline: positive when he is playing above his own level. */
  delta: number;
  /** The last games' averages, for the line shown beside the verdict. */
  pts: number;
  reb: number;
  ast: number;
  /** How many of his latest games `recent` covers (5, or 3 while the season is young). */
  window: number;
  games: number;
};

/** A cameo says nothing: games under this many minutes are not counted. */
const MIN_MINUTES = 8;

/**
 * How a player's recent games compare with the rest of his season, from his game log (newest first): the last five games
 * against the ones before them, or the last three while the season is young (fewer than ten games played). Needs three
 * games to compare against; otherwise null.
 */
export function formOf(log: GameLogEntry[]): Form | null {
  const played = log.filter((g) => g.min >= MIN_MINUTES);
  const recent = played.length >= 10 ? 5 : 3;
  const last = played.slice(0, recent);
  const rest = played.slice(recent);
  if (last.length < recent || rest.length < 3) return null;
  const mean = (games: GameLogEntry[], pick: (g: GameLogEntry) => number) => games.reduce((t, g) => t + pick(g), 0) / games.length;
  const r = mean(last, gameImpact);
  const b = mean(rest, gameImpact);
  return {
    recent: r,
    baseline: b,
    delta: r - b,
    pts: mean(last, (g) => g.pts),
    reb: mean(last, (g) => g.reb),
    ast: mean(last, (g) => g.ast),
    window: recent,
    games: played.length,
  };
}

export type FormEntry<T> = { who: T; form: Form };

/** Players ranked from hottest to coldest by how far the last five sit above or below their own level. */
export function rankByForm<T>(entries: { who: T; log: GameLogEntry[] | undefined }[]): FormEntry<T>[] {
  return entries
    .flatMap((e) => {
      const form = e.log ? formOf(e.log) : null;
      return form ? [{ who: e.who, form }] : [];
    })
    .sort((a, b) => b.form.delta - a.form.delta);
}

/** "7-15" -> [7, 15]. */
const madeAttempted = (text: string): [number, number] => {
  const [m, a] = text.split('-').map(Number);
  return [Number.isFinite(m) ? m : 0, Number.isFinite(a) ? a : 0];
};

/**
 * The classic NBA efficiency per game: points, rebounds, assists, steals and blocks, less missed shots, missed free throws and
 * turnovers. Null with fewer than three games of real minutes.
 */
export function efficiencyOf(log: GameLogEntry[]): number | null {
  const played = log.filter((g) => g.min >= MIN_MINUTES);
  if (played.length < 3) return null;
  const total = played.reduce((t, g) => {
    const [fgm, fga] = madeAttempted(g.fg);
    const [ftm, fta] = madeAttempted(g.ft);
    return t + g.pts + g.reb + g.ast + g.stl + g.blk - (fga - fgm) - (fta - ftm) - g.to;
  }, 0);
  return total / played.length;
}
