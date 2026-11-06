import type { WatchlistProps } from '@/lib/widgets';

/** What the widget gallery and a never-opened widget show. */
export const SAMPLE_WATCHLIST: WatchlistProps = {
  games: [
    { away: 'DEN', home: 'LAL', awayLogo: '', homeLogo: '', awayColor: '#FEC524', homeColor: '#FDB927', awayScore: '98', homeScore: '101', status: 'Q4 3:12', live: true },
    { away: 'BOS', home: 'MIA', awayLogo: '', homeLogo: '', awayColor: '#2BA84A', homeColor: '#F9423A', awayScore: '', homeScore: '', status: 'Thu 7:30 PM', live: false },
    { away: 'PHI', home: 'DET', awayLogo: '', homeLogo: '', awayColor: '#2E7DD6', homeColor: '#C8102E', awayScore: '104', homeScore: '108', status: 'Final', live: false },
  ],
  players: [
    { name: 'Luka Doncic', avatar: '', line: '41 pts · 10 reb · 8 ast', pts: '41', reb: '10', ast: '8', result: 'W 127-120' },
    { name: 'Nikola Jokic', avatar: '', line: '28 pts · 14 reb · 9 ast', pts: '28', reb: '14', ast: '9', result: 'L 98-101' },
    { name: 'Stephen Curry', avatar: '', line: '36 pts · 6 reb · 6 ast', pts: '36', reb: '6', ast: '6', result: 'W 118-110' },
  ],
};
