export type Heat = { level: 'none' | 'close' | 'clutch'; label: string };

const NONE: Heat = { level: 'none', label: '' };

/** "3:12 - 4th" -> { period: 4, seconds: 192 }; "OT" -> overtime; anything else (halftime, final, tip time) -> null. */
export function parseLiveStatus(status: string): { period: number; seconds: number } | null {
  const m = /(\d+):(\d+)\s*-\s*(?:(\d)(?:st|nd|rd|th)|(\d)?OT)/i.exec(status);
  if (!m) return null;
  const seconds = Number(m[1]) * 60 + Number(m[2]);
  const overtime = /OT/i.test(status);
  return { period: overtime ? 5 + (m[4] ? Number(m[4]) - 1 : 0) : Number(m[3]), seconds };
}

/**
 * How tense a live game is: within five points in the last five minutes of the fourth quarter (or any overtime) is a
 * close game, within three inside the last two minutes is clutch time.
 */
export function gameHeat(awayScore: number | undefined, homeScore: number | undefined, status: string): Heat {
  if (awayScore == null || homeScore == null) return NONE;
  const live = parseLiveStatus(status);
  if (!live || live.period < 4) return NONE;
  const margin = Math.abs(awayScore - homeScore);
  const overtime = live.period > 4;
  if (margin <= 3 && (overtime || live.seconds <= 120)) return { level: 'clutch', label: 'Clutch time' };
  if (margin <= 5 && (overtime || live.seconds <= 300)) return { level: 'close', label: overtime ? 'Overtime' : 'Close game' };
  return NONE;
}
