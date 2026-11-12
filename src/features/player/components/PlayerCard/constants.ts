import { palette } from '@/lib/theme';
export const MAX_ROTATE = 10;
export const RADIUS = 28;

/** The card's height as a multiple of its width: tall enough for the photo, the name, the tags and the season line. */
export const CARD_RATIO = 1.4;

/** The card's width on a screen this wide, and its height. */
export const playerCardSize = (screenWidth: number) => {
  const width = Math.min(screenWidth * 0.74, 300);
  return { width, height: Math.round(width * CARD_RATIO) };
};

export const FOOTER_PAD = 14;
export const STATS_HEIGHT = 56;
/** How far the photo's bottom edge sits above the card's: it fades into the footer. */
export const PHOTO_BOTTOM = 116;

/** The five numbers on the card's season line and the league-leaders category that ranks each (ESPN lists the top 50 of each). */
export const CARD_STATS = [
  { key: 'ppg', label: 'PPG', category: 'ppg' },
  { key: 'rpg', label: 'RPG', category: 'rpg' },
  { key: 'apg', label: 'APG', category: 'apg' },
  { key: 'spg', label: 'SPG', category: 'stpg' },
  { key: 'bpg', label: 'BPG', category: 'bpg' },
] as const;

/** The champion badge's gold. */
export const CHAMPION_GOLD = palette.gold;

/** How many places down a rank is still worth showing (the leaders feed is cut at 50). */
export const RANK_SHOWN = 50;

/**
 * The team logo watermark, a little smaller than it used to be (0.75) and higher (it sat 14% of the card's height down, right behind the
 * face; 0.9 was tried and was far too big). A fraction of the card's width, and its top edge as a fraction of it.
 */
export const WATERMARK_SIZE = 0.62;
export const WATERMARK_TOP = 0.08;
