import type { ConferenceStandings } from '../espn';
import { ordinal } from './team-stats';

/** "7th in the West": where a team sits in its conference. ESPN's own text switches between conference and division. */
export function conferenceStanding(standings: ConferenceStandings | undefined, teamId: string | null | undefined): string | undefined {
  if (!standings || !teamId) return undefined;
  for (const [conf, name] of [['east', 'East'], ['west', 'West']] as const) {
    const row = standings[conf].find((e) => e.teamId === teamId);
    if (row) return `${ordinal(row.seed)} in the ${name}`;
  }
  return undefined;
}
