import { fonts, palette } from './theme';

/**
 * The scales the app is built on. They are the values the app already uses most (the numbers were measured across every screen), so a
 * screen moved onto them barely changes: what they remove is the near-misses (a 13 beside a 14, a 15 beside a 16, seven slightly
 * different white overlays), which make screens "almost the same". Use these for anything new; move old code onto them as it is touched.
 */

/** Translucent white layers over the dark page, faintest to strongest: what cards, rows, fields and chips are made of. */
export const surfaces = {
  /** A row inside a card, a resting chip. */
  faint: 'rgba(255,255,255,0.04)',
  /** A card, a list row, a field. The usual one. */
  card: 'rgba(255,255,255,0.05)',
  /** Raised or pressed: a selected row, a button, a chip on a card. */
  raised: 'rgba(255,255,255,0.08)',
} as const;

/** Corner radii. A pill is `radius.pill`; a circle is half its size. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

/** Spacing: gaps, paddings, margins. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Font sizes. Numbers on a scoreboard use `display` and up; the rest is Barlow. */
export const fontSize = { micro: 10, caption: 11, label: 12, small: 13, body: 14, large: 16, title: 20, heading: 24, display: 32, hero: 48 } as const;

/** Animation durations in milliseconds: a press, a state change, an entrance. The easing is `Easing.out(Easing.cubic)`. */
export const motion = { fast: 160, base: 240, slow: 450 } as const;

/** Text styles that recur: spread one into a StyleSheet entry (`{ ...textStyle.sectionLabel, marginBottom: 8 }`) or use the component made for it. */
export const textStyle = {
  /** The small uppercase label over a card or a list ("SHOOTING", "RECENT"). */
  sectionLabel: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  /** The headline of an empty or failed screen. */
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 28, color: palette.chalk },
  /** What an empty or failed screen says under it. */
  emptyText: { fontFamily: fonts.body, fontSize: fontSize.large - 1, color: palette.muted, textAlign: 'center' },
} as const;

/**
 * The Courtside Rating's colors, a solid square per band of the 1-10 scale: under 6 red, 6-7 orange, 7-8 green, 8-9 light blue, 9 and up a
 * solid blue. The red and the green are the app's loss and win; the others are this scale's own.
 */
const RATING_BANDS: { from: number; background: string }[] = [
  { from: 9, background: '#2563EB' },
  { from: 8, background: '#60C5F1' },
  { from: 7, background: "#00A86B" },
  { from: 6, background: '#FB923C' },
  { from: -Infinity, background: "#B22222" },
];

/** The square behind a rating and the text on it (white on every band, as the user asked). The rating is rounded to the tenth first, so 5.96 (shown as 6.0) is orange, not red. */
export function ratingTone(rating: number): { background: string; text: string } {
  const shown = Math.round(rating * 10) / 10;
  const background = (RATING_BANDS.find((b) => shown >= b.from) ?? RATING_BANDS[RATING_BANDS.length - 1]).background;
  return { background, text: '#FFFFFF' };
}
