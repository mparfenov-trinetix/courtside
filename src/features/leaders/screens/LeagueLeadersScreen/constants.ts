import type { LeaderCategory } from '@/lib/espn';

/** The pager's pages: the three that are worked out in the app or come from the sportsbook, then one per ESPN category. */
export const PAGES: { key: string; label: string; full: string; category?: LeaderCategory }[] = [
  { key: 'form', label: 'HOT/COLD', full: 'Hot and cold' },
  { key: 'odds', label: 'ODDS', full: 'Award odds' },
  { key: 'ppg', label: 'PPG', full: 'Points Per Game', category: 'ppg' },
  { key: 'rpg', label: 'RPG', full: 'Rebounds Per Game', category: 'rpg' },
  { key: 'apg', label: 'APG', full: 'Assists Per Game', category: 'apg' },
  { key: 'stpg', label: 'STL', full: 'Steals Per Game', category: 'stpg' },
  { key: 'bpg', label: 'BLK', full: 'Blocks Per Game', category: 'bpg' },
  { key: 'eff', label: 'EFF', full: 'Efficiency' },
  { key: 'tpm', label: '3PM', full: '3-Pointers Made Per Game', category: 'tpm' },
  { key: 'tppct', label: '3P%', full: '3-Point Percentage · made per game in brackets', category: 'tppct' },
  { key: 'fgpct', label: 'FG%', full: 'Field Goal Percentage · made per game in brackets', category: 'fgpct' },
  { key: 'ftpct', label: 'FT%', full: 'Free Throw Percentage · made per game in brackets', category: 'ftpct' },
  { key: 'topg', label: 'TOV', full: 'Turnovers Per Game', category: 'topg' },
  { key: 'dd', label: 'DD', full: 'Double-Doubles', category: 'dd' },
  { key: 'mpg', label: 'MPG', full: 'Minutes Per Game', category: 'mpg' },
  { key: 'pfpg', label: 'PF', full: 'Fouls Per Game', category: 'pfpg' },
];
