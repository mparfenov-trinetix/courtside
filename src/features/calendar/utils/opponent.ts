import type { Team } from '@/lib/espn';
import { teamTheme } from '@/lib/theme';

/** How an opponent looks on a day cell or an agenda row: its color and a logo that reads on that color. */
export type OpponentLook = { color: string; logo: string };

/** The opponent's team color and its dark-background logo (from the teams list), falling back to the game's own logo. */
export function opponentLook(teams: Team[] | undefined, opponentId: string, fallbackLogo: string): OpponentLook | null {
  const team = teams?.find((t) => t.id === opponentId);
  if (!team) return null;
  return { color: teamTheme(team).primary, logo: team.logoDark || team.logo || fallbackLogo };
}
