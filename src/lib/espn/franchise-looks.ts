/**
 * Logo eras that are not name changes. A team can keep its name and change its logo (the Warriors' warrior with a lightning bolt became the
 * Bay Bridge in 2010, the Clippers' and the Kings' marks were redrawn), and ESPN holds neither the date nor the old picture, so they are kept
 * by hand here, one row per past look, oldest first, per ESPN team id. The look the team wears today has no row: it is ESPN's own logo.
 *
 * `from` and `to` are seasons, the year a season ends in (2000 is 1999-2000), both included. **No look starts before 2000**: the app has no data from
 * before then, so an older logo would never be shown (a logo that began earlier is carried from 2000). `key` names the picture: the file is registered as
 * `<teamId>|<key>` in `components/EraLogos`. `colors` are the look's own card colors `[primary, secondary]`, only where the logo needs them
 * to stand out from its card (see `ERA_COLORS` in `franchise.ts`); without them the card keeps today's colors.
 */
export type TeamLook = { from: number; to: number; key: string; colors?: [string, string] };

export const TEAM_LOOKS: Record<string, TeamLook[]> = {
  // Golden State Warriors: the warrior with a lightning bolt, in navy and orange, worn until 2009-10. The Bay Bridge came with 2010-11. The card is orange with a navy stripe: the logo's figure is navy, and on today's royal blue card it would sink.
  '9': [{ from: 2000, to: 2010, key: 'warrior-1997', colors: ['#F47B20', '#0B2B6B'] }],
  // Cleveland Cavaliers: the shield and sword in wine and navy (2003-04 to 2009-10, carried back to 2000 over the black-square logo of the 1990s), the same
  // with gold (2010-11 to 2016-17).
  '5': [
    { from: 2000, to: 2010, key: 'cavs-2004', colors: ['#2B2F3A', '#FFB81C'] },
    { from: 2011, to: 2017, key: 'cavs-2011', colors: ['#2B2F3A', '#FDBB30'] },
  ],
  // Denver Nuggets: the skyline lettering, until 2002-03, then the mountain over gold lettering, 2003-04 to 2007-08, and the navy and gold one, 2008-09 to 2017-18 (ESPN's logo is the 2018-19 one).
  '7': [
    { from: 2000, to: 2003, key: 'nuggets-1994', colors: ['#1D2F57', '#F2B21B'] },
    { from: 2004, to: 2008, key: 'nuggets-2004', colors: ['#1D2F57', '#F2B21B'] },
    { from: 2009, to: 2018, key: 'nuggets-2009', colors: ['#1D2F57', '#F2B21B'] },
  ],
  // Detroit Pistons: the flaming horse in teal, until 2000-01 (2001-02 to 2004-05 is not carried), then the red and blue ball, 2005-06 to 2016-17.
  '8': [
    { from: 2000, to: 2001, key: 'pistons-1997', colors: ['#8C1D2C', '#00A3AD'] },
    { from: 2006, to: 2017, key: 'pistons-2006', colors: ['#2A2F3A', '#C8102E'] },
  ],
  // Milwaukee Bucks: the buck's head in a triangle, until 2005-06, then the green and red buck's head, 2006-07 to 2014-15.
  '15': [
    { from: 2000, to: 2006, key: 'bucks-1994', colors: ['#2A2A2E', '#6FBF4A'] },
    { from: 2007, to: 2015, key: 'bucks-2007', colors: ['#D8D2B4', '#00471B'] },
  ],
  // Minnesota Timberwolves: the wolf among pines, until 2007-08, and the same wolf redrawn, 2008-09 to 2016-17.
  '16': [
    { from: 2000, to: 2008, key: 'wolves-1997', colors: ['#3B6C8C', '#2E9E57'] },
    { from: 2009, to: 2017, key: 'wolves-2009', colors: ['#3B6C8C', '#2E9E57'] },
    // ESPN's logo is the 2026-27 one now; the circle with the wolf of 2017-18 to 2025-26 is the one before it.
    { from: 2018, to: 2026, key: 'wolves-2018', colors: ['#9AA6B5', '#78BE20'] },
  ],
  // Orlando Magic: the star and comet, 2000-01 to 2009-10, then the lettering over the ball, 2010-11 to 2024-25. 1999-2000 keeps today's logo.
  '19': [
    { from: 2001, to: 2010, key: 'magic-2001', colors: ['#1B1F2E', '#0077C0'] },
    { from: 2011, to: 2025, key: 'magic-2011', colors: ['#7E8AA0', '#0077C0'] },
  ],
  // Philadelphia 76ers: the star-burst 76ers with the ball, until 2008-09.
  '20': [{ from: 2000, to: 2009, key: 'sixers-1998', colors: ['#7A1F2E', '#D9B36A'] }],
  // San Antonio Spurs: the black and silver spurs, 2002-03 to 2016-17, carried back to 2000 over the fiesta stripe of the 1990s.
  '24': [
    { from: 2000, to: 2017, key: 'spurs-2003', colors: ['#E0E2E6', '#1D1D1D'] },
  ],
  // Atlanta Hawks: the hawk over a ball in navy and red, 2007-08 to 2014-15, carried back to 2000 over the red and black one of 1995-2007. The slate card lets the dark outline of the hawk stand out.
  '1': [
    { from: 2000, to: 2015, key: 'hawks-2008', colors: ['#566175', '#E03A3E'] },
  ],
  // LA Clippers: the red and blue ball with the speed lines, 1999-2000 to 2014-15 (the 2011 redraw looks the same),
  // then the round LA ball of the alternate logo, 2015-16 to 2023-24.
  '12': [
    { from: 2000, to: 2015, key: 'clippers-1985', colors: ['#7D8794', '#C8102E'] },
    { from: 2016, to: 2024, key: 'clippers-2016', colors: ['#BFC5CF', '#C8102E'] },
  ],
  // Sacramento Kings: the crown and swords, until 2015-16.
  '23': [
    { from: 2000, to: 2016, key: 'kings-1995', colors: ['#2A2A33', '#A1AAB1'] },
  ],
  // Utah Jazz: the mountain in navy and light blue, 2004-05 to 2009-10, carried back to 2000 over the purple and teal one of 1996-2004, then the navy,
  // gold and green mountain, 2010-11 to 2015-16 (ESPN's logo is the 2025-26 one now).
  '26': [
    { from: 2000, to: 2010, key: 'jazz-2005', colors: ['#6CA8DC', '#0B2265'] },
    { from: 2011, to: 2016, key: 'jazz-2011', colors: ['#002B5C', '#F9A01B'] },
  ],
  // Washington Wizards: the brown and blue wizard (until 2010-11, the 2007-08 redraw looks the same), then the red and navy one (2011-12 to 2014-15).
  '27': [
    { from: 2000, to: 2011, key: 'wizards-1998', colors: ['#9FB3C8', '#2F6EA5'] },
    { from: 2012, to: 2015, key: 'wizards-2012', colors: ['#4C5A78', '#E31837'] },
  ],
  // Toronto Raptors: the dinosaur on the purple ring (until 2007-08), then on the red ring (2008-09 to 2014-15).
  '28': [
    { from: 2000, to: 2008, key: 'raptors-1996', colors: ['#4A515C', '#CE1141'] },
    { from: 2009, to: 2015, key: 'raptors-2009', colors: ['#4A515C', '#CE1141'] },
  ],
};

/** The past look of a team in a season, when the app keeps one for it. */
export function lookIn(teamId: string, season?: number): TeamLook | undefined {
  if (season == null || Number.isNaN(season)) return undefined;
  return TEAM_LOOKS[teamId]?.find((l) => season >= l.from && season <= l.to);
}
