import { palette } from '@/lib/theme';
/** The badge's tint by overall, the usual game-card ladder, brightest at the top. */
export const tintFor = (overall: number) => (overall >= 95 ? '#F5C242' : overall >= 90 ? '#A78BFA' : overall >= 85 ? '#4FA3F7' : palette.win);

/** Degrees the card turns at full tilt (a little less than the team card: it sits in a scrolling page). */
export const MAX_ROTATE = 8;
export const RADIUS = 22;
export const CARD_HEIGHT = 178;
/** The number counts up from zero over this long, starting a beat after the card lands. */
export const COUNT_MS = 1100;
export const COUNT_DELAY_MS = 450;
