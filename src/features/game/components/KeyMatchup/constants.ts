/** Side padding of the section, and the gap between the two cards (the VS badge sits over it). */
export const SIDE = 16;
export const GAP = 10;
/** A duel card's height as a multiple of its width. */
export const CARD_RATIO = 1.46;
export const RADIUS = 22;
/** The photo's width and height as fractions of the card's width, and how far its bottom edge sits above the card's. */
export const PHOTO_W = 0.86;
export const PHOTO_H = 0.9;
export const PHOTO_BOTTOM = 86;
/** The entrance: how long the cards take to meet (a spring, so they overshoot a little and settle), and the wait before it starts. */
export const MEET_DELAY_MS = 250;
export const STATS = [
  { key: 'ppg', label: 'PPG' },
  { key: 'rpg', label: 'RPG' },
  { key: 'apg', label: 'APG' },
] as const;
