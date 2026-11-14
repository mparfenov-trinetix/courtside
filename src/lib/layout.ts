/**
 * How wide the app is allowed to be. The screens are drawn for a phone: on an iPad or a Mac window the app is as wide as the window up to
 * `COLUMN_MAX` (every iPad in portrait, an 11-inch one in landscape), and beyond that a column in the middle of the window, and everything that is sized from "the width of the screen" (pagers, cards, charts) is sized from the
 * column, not from the window. Pure, so Node's tests can load it.
 */
export const COLUMN_MAX = 4000;

/** From this app width on (an iPad, a Mac window) the layout may use the room: bigger cards, two columns where a list is long. */
export const REGULAR_MIN = 600;

/** The width of the column the app is drawn in, for a window `windowWidth` wide. */
export const appWidthOf = (windowWidth: number): number => Math.max(0, Math.min(windowWidth, COLUMN_MAX));

/** Whether the app is as wide as an iPad's or a Mac window's column (not a phone's). */
export const isRegularWidth = (windowWidth: number): boolean => appWidthOf(windowWidth) >= REGULAR_MIN;

/** A bottom sheet (a view picker, a legend) is never wider than this, however wide the window: a sheet as wide as an iPad is a wall. */
export const SHEET_MAX = 560;

/** The widest a page of cards or rows is drawn; wider windows keep the page's background and centre the content. */
export const READABLE_MAX = 1000;

/** For a page scroller's `contentContainerStyle`: the content takes the window's width up to `READABLE_MAX`, centred. */
export const READABLE = { width: '100%', maxWidth: READABLE_MAX, alignSelf: 'center' } as const;

/**
 * How much the interface's own sizes (logos, avatars, names, scores) grow with the room: 1 on a phone, so the phone's layout is exactly what it
 * was, a little more on an iPad in portrait, more again on a wide iPad or a Mac window. Used by `useScale` and multiplied into the sizes of the
 * components that were drawn for a phone and looked small on a bigger screen.
 */
export const uiScale = (windowWidth: number): number => {
  const w = appWidthOf(windowWidth);
  if (w < REGULAR_MIN) return 1;
  if (w < 900) return 1.2;
  return 1.35;
};
