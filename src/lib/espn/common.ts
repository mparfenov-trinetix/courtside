import type { Json } from './client';

export function hex(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
  return `#${value.toUpperCase()}`;
}

/**
 * "NBA Cup - Group Play" -> "Group Play"; undefined for any game that isn't Cup. The first edition (2023-24) was called the
 * In-Season Tournament, and its final's note has no dash ("NBA In-Season Tournament Championship").
 */
export function cupStage(note: unknown): string | undefined {
  const m = /NBA (?:Cup|In-Season Tournament)\s*[-–:]?\s*(.*)$/i.exec(typeof note === 'string' ? note : '');
  return m ? m[1].trim() || 'NBA Cup' : undefined;
}

export function parseScore(score: unknown): number | undefined {
  if (score == null) return undefined;
  if (typeof score === 'object' && score !== null && 'value' in score) return (score as Json).value;
  const n = Number(score);
  return isNaN(n) ? undefined : n;
}

/** The NBA season's ending year: 2027 is the 2026-27 season. */
export function currentSeason(): number {
  const now = new Date();
  return now.getFullYear() + (now.getMonth() >= 9 ? 1 : 0);
}

/** 2027 -> "2026-27". */
export const seasonLabel = (year: number) => `${year - 1}-${String(year).slice(2)}`;
