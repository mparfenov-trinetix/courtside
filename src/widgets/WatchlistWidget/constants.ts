import type { WatchlistGameProps, WatchlistPlayerProps, WatchlistProps } from '@/lib/widgets';

export const SAMPLE_WATCHLIST: WatchlistProps = {
  games: [
    { away: 'DEN', home: 'LAL', awayLogo: '', homeLogo: '', awayScore: '98', homeScore: '101', status: 'Q4 3:12', live: true },
    { away: 'BOS', home: 'MIA', awayLogo: '', homeLogo: '', awayScore: '', homeScore: '', status: 'Thu 7:30 PM', live: false },
    { away: 'PHI', home: 'DET', awayLogo: '', homeLogo: '', awayScore: '104', homeScore: '108', status: 'Final', live: false },
  ],
  players: [
    { name: 'Luka Doncic', avatar: '', line: '41 pts · 10 reb · 8 ast', result: 'W 127-120' },
    { name: 'Nikola Jokic', avatar: '', line: '28 pts · 14 reb · 9 ast', result: 'L 98-101' },
    { name: 'Stephen Curry', avatar: '', line: '36 pts · 6 reb · 6 ast', result: 'W 118-110' },
  ],
};
