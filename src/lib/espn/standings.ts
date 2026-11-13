import { getJson, report } from './client';
import type { Json } from './client';
import { currentSeason, teamLogo } from './common';
import { eraLogoFor } from './franchise';

export type StandingEntry = {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  teamLogo: string;
  wins: number;
  losses: number;
  winPct: number;
  gamesBehind: number;
  seed: number;
  streak: string;
  lastTen: string;
  home: string;
  road: string;
  diff: number;
};

export type ConferenceStandings = {
  east: StandingEntry[];
  west: StandingEntry[];
};

export async function fetchStandings(season: number = currentSeason()): Promise<ConferenceStandings> {
  // Past seasons come from a different shape of the same feed (conferences carry their table directly).
  const json = await getJson(
    season === currentSeason()
      ? 'https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&type=0&level=3'
      : `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${season}`,
  );
  const conferences: Json[] = json.children ?? [];

  const parseConference = (conf: Json): StandingEntry[] => {
    const entries: Json[] = conf.standings?.entries
      ? conf.standings.entries
      : (conf.children ?? []).flatMap((div: Json) => div.standings?.entries ?? []);
    return entries
      .map((e) => {
        const team = e.team ?? {};
        const stats: Json[] = e.stats ?? [];
        const stat = (name: string): number => (stats.find((s) => s.name === name)?.value ?? 0) as number;
        const text = (name: string): string => String(stats.find((s) => s.name === name || s.type === name)?.displayValue ?? '');
        return {
          teamId: String(team.id ?? ''),
          teamName: team.displayName ?? `${team.location ?? ''} ${team.name ?? ''}`.trim(),
          teamAbbr: team.abbreviation ?? '',
          teamLogo: eraLogoFor(String(team.id ?? ''), season) || teamLogo(team.abbreviation, team.logos?.[0]?.href),
          wins: stat('wins'),
          losses: stat('losses'),
          winPct: stat('winPercent'),
          gamesBehind: stat('gamesBehind'),
          seed: Math.round(stat('playoffSeed')),
          streak: text('streak'),
          lastTen: text('lasttengames'),
          home: text('Home'),
          road: text('Road'),
          diff: stat('differential'),
        };
      })
      .filter((e) => e.seed > 0)
      .sort((a, b) => a.seed - b.seed);
  };

  const east = conferences.find((c) => String(c.name ?? '').includes('Eastern') || c.id === '5');
  const west = conferences.find((c) => String(c.name ?? '').includes('Western') || c.id === '6');

  const standings = {
    east: east ? parseConference(east) : [],
    west: west ? parseConference(west) : [],
  };
  report('standings', standings.east.length < 10 || standings.west.length < 10 ? 'standings table is incomplete' : null);
  return standings;
}
