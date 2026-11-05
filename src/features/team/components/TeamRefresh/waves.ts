import type { Wave } from './types';

/** The value of a wave at `clock` (the loop's progress, 0..1; it may run past 1, the wave just repeats). */
export function waveAt(w: Wave | undefined, clock: number): number {
  'worklet';
  if (!w) return 0;
  const raw = (clock * (w.c ?? 1) + (w.p ?? 0)) % 1;
  const t = raw < 0 ? raw + 1 : raw;
  let v = 0;
  if (w.k === 'sine') v = Math.sin(2 * Math.PI * t);
  else if (w.k === 'abs') v = Math.abs(Math.sin(Math.PI * t));
  else if (w.k === 'saw') v = t * 2 - 1;
  else if (w.k === 'tri') v = t < 0.5 ? t * 4 - 1 : 3 - t * 4;
  // A hit that rings down: starts at rest, swings out, and settles back.
  else if (w.k === 'spring') v = Math.exp(-4.5 * t) * Math.sin(2 * Math.PI * 2.5 * t) * 1.6;
  // Lifts quickly, holds near the top, and comes back down.
  else if (w.k === 'plat') v = Math.pow(Math.sin(Math.PI * t), 0.45);
  else {
    // A single smooth spike in the middle of the loop.
    const d = (t - 0.5) * 6;
    v = Math.exp(-d * d);
  }
  return v * w.a;
}
