import { currentSeason } from './common';
import { teamInSeason } from './franchise';
import { fetchTeamSchedule } from './schedule';
import type { Game } from './schedule';
import { fetchStandings } from './standings';
import type { ConferenceStandings } from './standings';
import { fetchTeams } from './teams';
import type { Team } from './teams';

export type CupSide = { teamId: string; abbr: string; logo: string; score?: number };

/**
 * One game seen from neither team's side. `stage` is the Cup stage for Cup games ("Group Play"...) and
 * ESPN's full note for playoff and play-in games ("West 1st Round - Game 3").
 */
export type CupGame = {
  id: string;
  date: string;
  stage: string;
  completed: boolean;
  home: CupSide;
  away: CupSide;
};

/**
 * ESPN has no feed for Cup standings or brackets, but every Cup, play-in and playoff game carries a note,
 * and team schedules include games still to come. Reading the schedules and keeping the tagged games
 * rebuilds the whole event (the groups and brackets are built in src/lib/cup.ts and src/lib/bracket.ts).
 */
async function fetchTaggedGames(
  teams: Team[],
  opts: { season?: number; seasonType?: number },
  stageOf: (g: Game) => string | undefined,
): Promise<CupGame[]> {
  const schedules = await Promise.all(teams.map((t) => fetchTeamSchedule(t.id, opts).catch(() => [] as Game[])));
  const byId = new Map<string, CupGame>();
  const season = opts.season ?? currentSeason();
  teams.forEach((current, i) => {
    // The team as it was called in that season (the Sonics in 2007), not as it is called now.
    const team = teamInSeason(current, season);
    for (const g of schedules[i]) {
      const stage = stageOf(g);
      if (!stage || byId.has(g.id)) continue;
      const mine: CupSide = { teamId: current.id, abbr: team.abbreviation, logo: team.logoDark || team.logo, score: g.teamScore };
      const theirs: CupSide = { teamId: g.opponentId, abbr: g.opponentAbbr, logo: g.opponentLogo, score: g.opponentScore };
      byId.set(g.id, { id: g.id, date: g.date, stage, completed: g.completed, home: g.home ? mine : theirs, away: g.home ? theirs : mine });
    }
  });
  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchCupGames(season: number = currentSeason()): Promise<CupGame[]> {
  const teams = await fetchTeams();
  return fetchTaggedGames(teams, { season: season === currentSeason() ? undefined : season }, (g) => g.cup);
}

export type Postseason = {
  /** Playoff games, `stage` = ESPN's note. */
  playoffs: CupGame[];
  /** Play-in games, `stage` = ESPN's note. */
  playIn: CupGame[];
  standings: ConferenceStandings;
};

/** Only the ten teams per conference that can reach the postseason are asked for their schedules. */
export async function fetchPostseason(season: number): Promise<Postseason> {
  const [teams, standings] = await Promise.all([fetchTeams(), fetchStandings(season)]);
  const contenders = new Set([...standings.east, ...standings.west].filter((e) => e.seed <= 10).map((e) => e.teamId));
  const pool = contenders.size >= 16 ? teams.filter((t) => contenders.has(t.id)) : teams;
  const [playoffs, playIn] = await Promise.all([
    // Before 2003-04 a playoff game has no note at all: it is a playoff game by the schedule it came from, and the round is worked out later.
    fetchTaggedGames(pool, { season, seasonType: 3 }, (g) => g.note ?? 'Playoffs'),
    fetchTaggedGames(pool, { season, seasonType: 5 }, (g) => g.note),
  ]);
  return { playoffs, playIn, standings };
}
