export const MAX_ROTATE = 10;

 // degrees
export const RADIUS = 28;
export const GLINT = 150;

/** Teams whose logo is the same red as their card (the logo variant for dark backgrounds has a red body), so it needs a white outline. */
export const OUTLINED_LOGO = new Set(['HOU']);
/** Outline thickness as a fraction of the logo size. */
export const OUTLINE = 0.012;

/** The team's refresh motion was made for a small mark; on the card's big logo it reaches this many times further. */
export const REFRESH_REACH = 2.2;
/** Times the light sweeps across the card in one loop of the refresh. */
export const SWEEPS = 2;
