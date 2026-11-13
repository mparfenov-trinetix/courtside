import type { LeaderCategory } from '@/lib/espn';

/** The pager's pages: the three that are worked out in the app or come from the sportsbook, then one per ESPN category. */
export const PAGES: { key: string; label: string; full: string; category?: LeaderCategory }[] = [
  { key: 'form', label: 'HOT/COLD', full: 'Hot and cold' },
  { key: 'cr', label: 'BEST', full: 'Best games · Courtside Rating' },
  { key: 'odds', label: 'ODDS', full: 'Award odds' },
  { key: 'ppg', label: 'PPG', full: 'Points Per Game', category: 'ppg' },
  { key: 'rpg', label: 'RPG', full: 'Rebounds Per Game', category: 'rpg' },
  { key: 'apg', label: 'APG', full: 'Assists Per Game', category: 'apg' },
  { key: 'stpg', label: 'STL', full: 'Steals Per Game', category: 'stpg' },
  { key: 'bpg', label: 'BLK', full: 'Blocks Per Game', category: 'bpg' },
  { key: 'eff', label: 'EFF', full: 'Efficiency' },
  { key: 'per', label: 'PER', full: 'Player Efficiency Rating · among the top 50 scorers', category: 'per' },
  { key: 'pm', label: '+/−', full: 'Plus-minus Per Game · among the top 50 scorers', category: 'pm' },
  { key: 'tpm', label: '3PM', full: '3-Pointers Made Per Game', category: 'tpm' },
  { key: 'tppct', label: '3P%', full: '3-Point Percentage · made per game in brackets', category: 'tppct' },
  { key: 'fgpct', label: 'FG%', full: 'Field Goal Percentage · made per game in brackets', category: 'fgpct' },
  { key: 'ftpct', label: 'FT%', full: 'Free Throw Percentage · made per game in brackets', category: 'ftpct' },
  { key: 'topg', label: 'TOV', full: 'Turnovers Per Game', category: 'topg' },
  { key: 'dd', label: 'DD', full: 'Double-Doubles', category: 'dd' },
  { key: 'mpg', label: 'MPG', full: 'Minutes Per Game', category: 'mpg' },
  { key: 'pfpg', label: 'PF', full: 'Fouls Per Game', category: 'pfpg' },
  { key: 'orpg', label: 'OREB', full: 'Offensive Rebounds Per Game · among the top 50 rebounders', category: 'orpg' },
  { key: 'drpg', label: 'DREB', full: 'Defensive Rebounds Per Game · among the top 50 rebounders', category: 'drpg' },
];
