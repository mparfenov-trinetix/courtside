import type { Game, Team, TeamDetail } from '@/lib/espn';
import type { FixturesProps } from './fixtures-widget';
import type { FormGameProps, TeamFormProps } from './team-form-widget';

type Theme = { background: string; surface: string; accent: string };
type TeamLike = Pick<Team, 'abbreviation' | 'name' | 'logo' | 'logoDark'>;

/** A game counts as upcoming until about this long after tip-off. */
const GAME_LENGTH_MS = 3 * 60 * 60 * 1000;
const FORM_GAMES = 5;
export const FIXTURES_SHOWN = 5;

/** "W3" or "L2" from results newest first; empty with no results. */
export function streakOf(resultsNewestFirst: ('W' | 'L')[]): string {
  if (resultsNewestFirst.length === 0) return '';
  const first = resultsNewestFirst[0];
  let n = 0;
  while (n < resultsNewestFirst.length && resultsNewestFirst[n] === first) n++;
  return `${first}${n}`;
}

/** Pure: the last five finished games, record, streak and standing. */
export function buildFormProps(team: TeamLike, detail: Pick<TeamDetail, 'record' | 'standing'> | undefined, schedule: Game[], theme: Theme): TeamFormProps {
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

/** Pure: the next games, soonest first, with their day and time already formatted. */
export function buildFixturesProps(team: TeamLike, schedule: Game[], theme: Theme, now: Date = new Date()): FixturesProps {
  const upcoming = schedule
    .filter((g) => !g.completed && g.date && Date.parse(g.date) + GAME_LENGTH_MS > now.getTime())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, FIXTURES_SHOWN);
  return {
    teamAbbr: team.abbreviation,
    bg: theme.background,
    bg2: theme.surface,
    accent: theme.accent,
    logo: team.logoDark || team.logo || '',
    games: upcoming.map((g) => ({
      oppAbbr: g.opponentAbbr,
      oppName: g.opponent,
      oppLogo: g.opponentLogo,
      home: g.home,
      day: new Date(g.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      time: new Date(g.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      tag: g.cup ? 'NBA Cup' : '',
      gameId: g.id,
    })),
  };
}
