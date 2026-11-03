export const MODES = [
  { key: 'players', label: 'Players' },
  { key: 'teams', label: 'Teams' },
] as const;

export const SCOPES = [
  { key: 'season', label: 'This season' },
  { key: 'career', label: 'Career' },
] as const;

/** Per-game production against rough elite ceilings, so one chart works for guards and bigs. */
export const CEILING = { pts: 32, reb: 13, ast: 10, stl: 2.2, blk: 2.2, fg: 0.6 };
