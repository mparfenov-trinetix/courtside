import type { NextGameProps } from '@/lib/widgets';

/**
 * What the widget gallery and a freshly installed (never opened) widget show: a plausible fixture instead of an empty card.
 * The app replaces it with the real timeline as soon as it runs.
 */
export const SAMPLE_PROPS: NextGameProps = {
  teamAbbr: 'DEN',
  teamName: 'Denver Nuggets',
  record: '4-2',
  bg: '#0D1B2E',
  bg2: '#1B3A5F',
  accent: '#FEC524',
  logo: '',
  oppLogo: '',
  oppAbbr: 'TOR',
  oppName: 'Toronto Raptors',
  home: true,
  iso: '2030-01-01T02:00:00Z',
  day: 'THU, NOV 5',
  live: false,
  gameId: '',
  tag: '',
  myScore: '',
  oppScore: '',
  clock: '',
  timeText: '7:00 PM',
  countdownText: 'in 1 day, 6 hr',
};
