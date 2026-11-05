import type { Play } from '@/lib/espn';

/** NBA teams get seven timeouts per game. */
export const TIMEOUTS_PER_GAME = 7;

/** A stoppage in play: a team's own timeout, or an official/TV one that belongs to nobody. */
export type TimeoutInProgress = { teamId?: string };

const isStoppage = (p: Play) => /timeout/i.test(p.typeText);

/**
 * Whether a timeout is on right now: the newest play in the feed is a timeout, and play has not resumed since. ESPN
 * has no "timeout in progress" flag, but it logs the timeout as a play and the next play only arrives once the game
 * restarts. `live` guards against a game that ended or has not started.
 */
export function timeoutInProgress(plays: Play[], live: boolean): TimeoutInProgress | null {
  if (!live) return null;
  const last = plays[plays.length - 1];
  if (!last || !isStoppage(last)) return null;
  return { teamId: last.teamId || undefined };
}

/**
 * "NOP TO" for a timeout a team called, "Official TO" for a TV or official one, nothing when play is on. `teams` are the
 * two sides, to turn the team id on the play into its abbreviation.
 */
export function timeoutLabel(
  plays: Play[],
  live: boolean,
  teams: { team: { id: string; abbreviation: string } }[],
): string | undefined {
  const stoppage = timeoutInProgress(plays, live);
  if (!stoppage) return undefined;
  return `${teams.find((t) => t.team.id === stoppage.teamId)?.team.abbreviation ?? 'Official'} TO`;
}
