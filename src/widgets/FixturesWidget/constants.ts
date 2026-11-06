import type { FixtureProps, FixturesProps } from '@/lib/widgets';

/** What the widget gallery and a never-opened widget show. */
export const SAMPLE_FIXTURES: FixturesProps = {
  teamAbbr: 'DEN',
  bg: '#0D1B2E',
  bg2: '#1B3A5F',
  accent: '#FEC524',
  logo: '',
  games: [
    { oppAbbr: 'TOR', oppName: 'Toronto Raptors', oppLogo: '', home: true, day: 'Thu, Nov 5', time: '7:00 PM', tag: '', gameId: '' },
    { oppAbbr: 'POR', oppName: 'Portland Trail Blazers', oppLogo: '', home: false, day: 'Sat, Nov 7', time: '9:30 PM', tag: 'NBA Cup', gameId: '' },
    { oppAbbr: 'MIN', oppName: 'Minnesota Timberwolves', oppLogo: '', home: true, day: 'Mon, Nov 9', time: '7:00 PM', tag: '', gameId: '' },
    { oppAbbr: 'SAS', oppName: 'San Antonio Spurs', oppLogo: '', home: false, day: 'Wed, Nov 11', time: '8:00 PM', tag: '', gameId: '' },
    { oppAbbr: 'LAC', oppName: 'LA Clippers', oppLogo: '', home: true, day: 'Fri, Nov 13', time: '10:00 PM', tag: '', gameId: '' },
  ],
};
