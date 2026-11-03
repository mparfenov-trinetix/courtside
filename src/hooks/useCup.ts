import { useCupGames, useStandings } from './queries';
import { buildCup, type Conference } from '@/lib/league';

/** The NBA Cup, built from every team's schedule. `conferenceOf` comes from the standings feed. */
export function useCup(season?: number) {
  const games = useCupGames(season);
  const standings = useStandings(season);

  const conferenceOf: Record<string, Conference> = {};
  for (const e of standings.data?.east ?? []) conferenceOf[e.teamId] = 'east';
  for (const e of standings.data?.west ?? []) conferenceOf[e.teamId] = 'west';

  const cup = games.data ? buildCup(games.data, conferenceOf) : null;
  return { cup, conferenceOf, isPending: games.isPending, error: games.error, refetch: games.refetch };
}
