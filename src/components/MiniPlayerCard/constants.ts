/** A mini player card's height as a multiple of its width. */
export const MINI_CARD_RATIO = 1.46;
export const MINI_RADIUS = 22;
/** The photo's width and height as fractions of the card's width, and how far its bottom edge sits above the card's. */
export const PHOTO_W = 0.86;
export const PHOTO_H = 0.9;
export const PHOTO_BOTTOM = 86;
/** The three numbers on a card: season averages (a key matchup, Compare) or the game's own line (a finished game's duel). */
export const MINI_STATS = [
  { key: 'ppg', season: 'PPG', game: 'PTS' },
  { key: 'rpg', season: 'RPG', game: 'REB' },
  { key: 'apg', season: 'APG', game: 'AST' },
] as const;
