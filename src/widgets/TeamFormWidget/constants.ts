import type { TeamFormProps } from '@/lib/widgets';

/** What the widget gallery and a never-opened widget show. */
export const SAMPLE_FORM: TeamFormProps = {
  teamAbbr: 'DEN',
  teamName: 'Denver Nuggets',
  record: '4-2',
  standing: '2nd in Northwest Division',
  streak: 'W3',
  bg: '#0D1B2E',
  bg2: '#1B3A5F',
  accent: '#FEC524',
  logo: '',
  starName: 'N. Jokic',
  starAvatar: '',
  starPpg: '25.4',
  starRpg: '9.7',
  starApg: '9.3',
  games: [
    { result: 'L', opp: 'LAL', score: '98-104', home: false },
    { result: 'W', opp: 'PHX', score: '121-110', home: true },
    { result: 'W', opp: 'MIN', score: '113-99', home: true },
    { result: 'L', opp: 'OKC', score: '101-109', home: false },
    { result: 'W', opp: 'UTA', score: '127-105', home: true },
  ],
};
