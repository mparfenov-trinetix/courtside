import type { Game } from '@/lib/espn';
import { FIXTURES_SHOWN, GAME_LENGTH_MS } from './constants';
import type { FixturesProps, TeamLike, WidgetTheme } from './types';

/** Pure: the next games, soonest first, with their day and time already formatted. */
export function buildFixturesProps(team: TeamLike, schedule: Game[], theme: WidgetTheme, now: Date = new Date()): FixturesProps {
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
