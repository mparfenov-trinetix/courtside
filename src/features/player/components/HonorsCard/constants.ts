export const GOLD = '#FBBF24';

/** The big ones first, then team selections, then the rest. */
export const PRIORITY: [RegExp, number][] = [
  [/^MVP$/i, 0],
  [/finals mvp/i, 1],
  [/defensive player/i, 2],
  [/rookie of the year/i, 3],
  [/all-star mvp/i, 4],
  [/^nba all-star$/i, 4.5],
  [/(sixth|6th)|most improved|clutch|scoring champion|assists leader|rebounds leader/i, 5],
  [/all-nba 1st/i, 6],
  [/all-nba 2nd/i, 7],
  [/all-nba 3rd/i, 8],
  [/all-defensive 1st/i, 9],
  [/all-defensive 2nd/i, 10],
  [/all-rookie 1st/i, 11],
  [/all-rookie 2nd/i, 12],
];
