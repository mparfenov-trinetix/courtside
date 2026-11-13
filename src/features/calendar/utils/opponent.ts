import { seasonOfDate, teamInSeason, type Team } from '@/lib/espn';
import { teamTheme } from '@/lib/theme';

/** How an opponent looks on a day cell or an agenda row: its color and a logo that reads on that color. */
export type OpponentLook = { color: string; logo: string };

/**
 * The opponent's team color and its dark-background logo (from the teams list), falling back to the game's own logo. `date` is the game's:
 * an old game shows the logo the team wore then (the SuperSonics, not the Thunder), where the app has it.
 */
export function opponentLook(teams: Team[] | undefined, opponentId: string, fallbackLogo: string, date?: string): OpponentLook | null {
  const current = teams?.find((t) => t.id === opponentId);
  if (!current) return null;
  const team = teamInSeason(current, date ? seasonOfDate(date) : undefined);
  return { color: teamTheme(current).primary, logo: team.logoDark || team.logo || fallbackLogo };
}
