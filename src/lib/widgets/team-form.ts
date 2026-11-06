import type { Game, TeamDetail } from '@/lib/espn';
import { FORM_GAMES } from './constants';
import type { FormGameProps, TeamFormProps, TeamLike, WidgetTheme } from './types';

/** "W3" or "L2" from results newest first; empty with no results. */
export function streakOf(resultsNewestFirst: ('W' | 'L')[]): string {
  if (resultsNewestFirst.length === 0) return '';
  const first = resultsNewestFirst[0];
  let n = 0;
  while (n < resultsNewestFirst.length && resultsNewestFirst[n] === first) n++;
  return `${first}${n}`;
}

/** Pure: the last five finished games, record, streak and standing. */
export function buildFormProps(team: TeamLike, detail: Pick<TeamDetail, 'record' | 'standing'> | undefined, schedule: Game[], theme: WidgetTheme): TeamFormProps {
  const played = schedule
    .filter((g) => g.completed && g.result && typeof g.teamScore === 'number' && typeof g.opponentScore === 'number')
    .sort((a, b) => b.date.localeCompare(a.date));
  const games: FormGameProps[] = played
    .slice(0, FORM_GAMES)
    .reverse()
    .map((g) => ({ result: g.result as 'W' | 'L', opp: g.opponentAbbr, score: `${g.teamScore}-${g.opponentScore}`, home: g.home }));
  return {
    teamAbbr: team.abbreviation,
    teamName: team.name,
    record: detail?.record ?? '',
    standing: detail?.standing ?? '',
    streak: streakOf(played.map((g) => g.result as 'W' | 'L')),
    bg: theme.background,
    bg2: theme.surface,
    accent: theme.accent,
    logo: team.logoDark || team.logo || '',
    games,
  };
}
