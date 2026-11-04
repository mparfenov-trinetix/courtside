import { CELL, COURT_H, COURT_W } from './constants';

export type HeatCell = { cx: number; cy: number; made: number; att: number };

/**
 * Bins shots into a grid for the heat map. `base` is the overall make rate, which each cell is compared with (cells with
 * few shots are pulled toward it, so a single make doesn't light up the map).
 */
export function binShots(shots: { x: number; y: number; made: boolean }[]): { cells: HeatCell[]; base: number } {
  const base = shots.length ? shots.filter((s) => s.made).length / shots.length : 0;
  const grid = new Map<string, HeatCell>();
  for (const s of shots) {
    const cx = Math.min(Math.floor(s.x / CELL), Math.ceil(COURT_W / CELL) - 1);
    const cy = Math.min(Math.floor(s.y / CELL), Math.ceil(COURT_H / CELL) - 1);
    const cell = grid.get(`${cx}:${cy}`) ?? { cx, cy, made: 0, att: 0 };
    cell.att += 1;
    if (s.made) cell.made += 1;
    grid.set(`${cx}:${cy}`, cell);
  }
  return { cells: [...grid.values()], base };
}
