import { palette } from '@/lib/theme';

export const HEADSHOT_SIZE = 28;
export const ROW_H = 48;
export const HEADER_H = 32;
export const TOTALS_H = 44;
export const GOLD = palette.gold;
/** The Courtside Rating's square in the detailed view, as high as it is wide. */
export const RATING_BOX = 23;

/** Detailed view: the pinned player column (photo, name, rating) is this wide at rest and shrinks to the second width as the stats scroll. */
export const DETAIL_COL_FULL = 192;
export const DETAIL_COL_SHRUNK = 150;
/** How far the stats have to scroll for the player column to have shrunk all the way. */
export const DETAIL_SHRINK_AT = 56;

/** Default view: one bigger row per player and four columns that fit the screen with no sideways scroll. */
export const SIMPLE_ROW_H = 58;
export const SIMPLE_AVATAR = 48;
export const SIMPLE_RATING_BOX = 26;
export const SIMPLE_COL_W = { CR: 44, PTS: 46, REB: 46, AST: 46 } as const;
/** The columns of the default view, in order (the rating only for a finished game). */
export const SIMPLE_COLS = ['CR', 'PTS', 'REB', 'AST'] as const;
