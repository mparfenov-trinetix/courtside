export const PILL_WIDTH = 60;
export const PILL_HEIGHT = 68;
export const PILL_GAP = 6;
export const STRIP_PADDING = 12;
export const OUTLINE = 2;
export const LOGO = 34;
/**
 * The strip's height once the page under it has scrolled (labels gone, logos only). The logos never move inside the pill: they sit 10 pt
 * from its top, and 10 pt from its bottom once it is this tall, so shortening the strip only crops the codes away.
 */
export const COMPACT_HEIGHT = 54;
export const LOGO_TOP = 10;
/** The strip folds once the page has scrolled past this far, and a scroll that rests short of `COLLAPSE_AT` is finished for you (back to the top, or on to here). */
export const COMPACT_AT = 40;
export const COLLAPSE_AT = 120;
