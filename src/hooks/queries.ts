import { useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  fetchGameSummary,
  fetchGameVideos,
  fetchHeadToHead,
  fetchAllStars,
  fetchCupGames,
  fetchLeaderCategory,
  fetchPostseason,
  currentSeason,
  fetchPlayerCareer,
  fetchPlayerProfile,
  fetchPlayerGameLog,
  fetchPlayerStats,
  fetchPlayerBio,
  fetchRoster,
  fetchScoreboardByDate,
  fetchStandings,
  fetchTeamDetail,
  fetchLeagueTeamStats,
  fetchTeams,
  searchPlayers,
  fetchTeamSchedule,
  fetchTeamSeason,
  type Game,
  type GameVideo,
  type LeaderCategory,
  type ScoreboardGame,
} from '@/lib/espn';
import { scoreboardKeysFor, startsOnDay, toDateKey } from '@/lib/date';
import { awaitsTipOff, boardPhase, gamePhase, shotsOf } from '@/lib/game';

const HOUR = 60 * 60 * 1000;

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 24 * HOUR, // team list basically never changes
  });
}

/** Look up one team from the cached list (instant, no extra request). */
export function useTeam(teamId?: string | null) {
  const { data } = useTeams();
  return data?.find((t) => t.id === teamId) ?? null;
}

export function useTeamDetail(teamId?: string | null) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeamDetail(teamId!),
    enabled: !!teamId,
    staleTime: HOUR,
  });
}

export function useRoster(teamId?: string | null) {
  return useQuery({
    queryKey: ['roster', teamId],
    queryFn: () => fetchRoster(teamId!),
    enabled: !!teamId,
    staleTime: 6 * HOUR,
  });
}

export function useTeamSchedule(teamId?: string | null) {
  return useQuery({
    queryKey: ['schedule', teamId],
    queryFn: () => fetchTeamSchedule(teamId!),
    enabled: !!teamId,
    staleTime: 30 * 60 * 1000,
  });
}

/** A team's whole season (regular season, play-in, playoffs); a finished season never changes. */
export function useSeasonGames(teamId: string | null | undefined, season: number) {
  return useQuery({
    queryKey: ['teamSeason', teamId, season],
    queryFn: () => fetchTeamSeason(teamId!, season),
    enabled: !!teamId,
    staleTime: season === currentSeason() ? 30 * 60 * 1000 : Infinity,
  });
}

/** One category of the league leaders (the top `limit`). The second part of the key is the shape of the data: bump it if it changes. */
export function useLeaderCategory(category: LeaderCategory, limit = 50, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['leaders', 3, category, limit],
    queryFn: () => fetchLeaderCategory(category, limit),
    staleTime: HOUR,
  });
}

export function useStandings(season?: number) {
  const current = currentSeason();
  const year = season ?? current;
  return useQuery({
    // The current season keeps the plain ['standings'] key (it is persisted and refreshed elsewhere).
    queryKey: year === current ? ['standings'] : ['standings', year],
    queryFn: () => fetchStandings(year),
    // A finished season never changes.
    staleTime: year === current ? 30 * 60 * 1000 : Infinity,
  });
}

const LIVE_STALE_MS = 10_000;

/** A page that comes back into view (a page above it was closed) catches up at once if its data has gone stale. */
function useCatchUpOnFocus(focused: boolean, query: { isStale: boolean; refetch: () => unknown }) {
  useEffect(() => {
    if (focused && query.isStale) query.refetch();
    // Only a change of focus matters; staleness is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);
}

/**
 * Re-renders once a minute while `waiting`. The polling interval is worked out from the clock whenever the hook runs, so a
 * page left open before tip-off has to run it again to notice the game is about to start; without this it would sit
 * on its old snapshot until something else made it render.
 */
export function useMinuteTick(waiting: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [waiting]);
}

/** What a game that has just finished changes elsewhere: the team's record and form, the standings, the schedule. */
export function refreshAfterFinal(client: QueryClient) {
  const season = currentSeason();
  const keys = ['schedule', 'team', 'teamSeason', 'leagueTeamStats', 'standings', 'leaders', 'playerStats', 'playerGameLog'];
  client.invalidateQueries({
    predicate: (q) => {
      const [kind, year] = q.queryKey as [string, unknown];
      // Seasons that are over never change; only the current one is touched.
      if (kind === 'standings' || kind === 'teamSeason') return year === undefined || year === season || typeof year === 'string';
      return keys.includes(kind);
    },
  });
  client.invalidateQueries({ queryKey: ['cup', season] });
  client.invalidateQueries({ queryKey: ['postseason', season] });
}

/** The scoreboard query's fetch: when it shows a game that was on and now is over, the data that game changes is refreshed. */
export function scoreboardQueryFn(client: QueryClient, date: string) {
  return async () => {
    const next = await fetchScoreboardByDate(date);
    const prev = client.getQueryData<ScoreboardGame[]>(['scoreboard', date]);
    if (prev && next.some((g) => g.completed && prev.some((p) => p.id === g.id && !p.completed))) refreshAfterFinal(client);
    return next;
  };
}

export function useGameSummary(gameId?: string | null) {
  // A page buried under others must not keep polling ESPN for a game nobody is looking at.
  const focused = useIsFocused();
  const phaseOf = (data?: { live: boolean; completed: boolean; info: { date?: string } }) =>
    data ? gamePhase({ live: data.live, completed: data.completed, date: data.info.date }) : 'idle';
  const query = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => fetchGameSummary(gameId!),
    enabled: !!gameId,
    // A finished game never changes. One that is on, or about to start, goes stale in seconds, so coming back to it
    // refreshes it; anything else keeps the long window.
    staleTime: (q) => (q.state.data?.completed ? Infinity : phaseOf(q.state.data) === 'idle' ? 30 * 60 * 1000 : LIVE_STALE_MS),
    // Polls from twenty minutes before tip-off, so a page opened early is still there when the game starts.
    refetchInterval: (q) => {
      if (!focused) return false;
      const phase = phaseOf(q.state.data);
      return phase === 'live' ? 15_000 : phase === 'soon' ? 30_000 : false;
    },
  });
  useCatchUpOnFocus(focused, query);
  // A game still to be played: look at the clock again each minute, so polling starts when tip-off nears.
  useMinuteTick(focused && !!query.data && !query.data.completed && !query.data.live);
  return query;
}

/** Several games' summaries at once (the same cached queries the game page uses): for what shows a list of games' scores. */
export function useGameSummaries(ids: string[], enabled = true) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['game', id],
      enabled,
      queryFn: () => fetchGameSummary(id),
      // A finished game never changes; one that is on or still to come is looked at again every couple of minutes.
      staleTime: (q: { state: { data?: { completed: boolean } } }) => (q.state.data?.completed ? Infinity : 2 * 60 * 1000),
    })),
  });
}

/**
 * The games starting on a day of the device's own calendar, from the Eastern-keyed scoreboards that hold them, as a Spanish
 * evening sees it (a 02:00 tip-off is that morning's, not the American evening's). On today, a game that is on right now is
 * also listed even if it started the evening before (it is still the game to look at at 01:00).
 */
export function useGamesOnDay(day: Date, today: Date, enabled = true) {
  const [first, second] = scoreboardKeysFor(day);
  const a = useScoreboardByDate(first, enabled);
  const b = useScoreboardByDate(second ?? first, enabled);
  const isToday = toDateKey(day) === toDateKey(today);
  let games: ScoreboardGame[] | undefined;
  if (!a.isPending && !b.isPending) {
    const seen = new Set<string>();
    games = [];
    for (const g of [...(a.data ?? []), ...(b.data ?? [])]) {
      if (seen.has(g.id)) continue;
      if (startsOnDay(g.date, day) || (isToday && g.inProgress)) {
        seen.add(g.id);
        games.push(g);
      }
    }
  }
  const refetch = () => Promise.all([a.refetch(), b.refetch()]);
  return { games, isPending: a.isPending || b.isPending, error: a.error ?? b.error, refetch, keys: second ? [first, second] : [first] };
}

/** `enabled: false` reads nothing from the network (a page that is only being scrolled past); what is cached is still returned. */
/**
 * The highlight clips of several games, one list per game in the order given (so newest first when the games are). Each is its own
 * small query (`fetchGameVideos`: the clip list only, without normalizing the box score and plays), so a page that shows a few games'
 * clips does not parse a few games' worth of everything.
 */
export function useGameVideos(ids: string[], enabled = true): { perGame: GameVideo[][]; pending: boolean } {
  const queries = useQueries({
    queries: ids.map((id) => ({
      enabled,
      queryKey: ['gameVideos', id],
      queryFn: () => fetchGameVideos(id),
      // Clips of a finished game hardly change; one that has just ended gets more cut for a while.
      staleTime: 10 * 60 * 1000,
    })),
  });
  return { perGame: queries.map((q) => q.data ?? []), pending: enabled && queries.some((q) => q.isPending) };
}

/**
 * False until the screen has settled: a pause after it mounts. For work that is nice to have but not needed to draw the page
 * (a row of clips, a prefetch), so it does not compete with the first frames or the first scroll.
 */
export function useAfterSettle(delayMs = 900) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Longer than a screen transition (about 400 ms), so the first frames and the first scroll are over.
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  return ready;
}

export function useScoreboardByDate(date: string, enabled = true) {
  const focused = useIsFocused();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['scoreboard', date],
    queryFn: scoreboardQueryFn(client, date),
    // A day with a game on (or about to start) goes stale in seconds; a quiet or finished day keeps the long window.
    staleTime: (q) => (boardPhase(q.state.data) === 'idle' ? 5 * 60 * 1000 : LIVE_STALE_MS),
    // The first fetch of a day often shows nothing live yet, so polling has to begin before tip-off, not once a game is on.
    refetchInterval: (q) => {
      if (!focused) return false;
      const phase = boardPhase(q.state.data);
      return phase === 'live' ? 20_000 : phase === 'soon' ? 30_000 : false;
    },
    enabled: !!date && enabled,
  });
  useCatchUpOnFocus(focused, query);
  useMinuteTick(focused && awaitsTipOff(query.data));
  return query;
}

export function usePlayerStats(athleteId?: string | null) {
  return useQuery({
    queryKey: ['playerStats', athleteId],
    queryFn: () => fetchPlayerStats(athleteId!),
    enabled: !!athleteId,
    staleTime: HOUR,
  });
}

export function usePlayerGameLog(athleteId?: string | null) {
  return useQuery({
    queryKey: ['playerGameLog', athleteId],
    queryFn: () => fetchPlayerGameLog(athleteId!),
    enabled: !!athleteId,
    staleTime: 30 * 60 * 1000,
  });
}

export function usePlayerSearch(query: string) {
  const q = query.trim();
  return useQuery({
  const { data: teams } = useTeams();
    // A shape version: the older feed's results (current players only) are not reused.
    queryKey: ['playerSearch', 2, q.toLowerCase()],
    queryFn: () => searchPlayers(q),
    enabled: q.length >= 2,
    staleTime: HOUR,
  });
    // The feed names a team but has no id: a team still in the league gets its id and abbreviation (a retired player's old club may not).
    select: (rows) =>
      rows.map((p) => {
        const team = teams?.find((t) => t.displayName === p.teamName);
        return team ? { ...p, teamId: team.id, teamAbbr: team.abbreviation } : p;
      }),
}

export function useLeagueTeamStats() {
  return useQuery({
    queryKey: ['leagueTeamStats'],
    queryFn: fetchLeagueTeamStats,
    staleTime: HOUR,
  });
}

export function usePlayerCareer(athleteId?: string | null) {
  return useQuery({
    queryKey: ['playerCareer', athleteId],
    queryFn: () => fetchPlayerCareer(athleteId!),
    enabled: !!athleteId,
    staleTime: HOUR,
  });
}

export function useCupGames(season?: number) {
  const current = currentSeason();
  const year = season ?? current;
  return useQuery({
    queryKey: ['cup', year],
    queryFn: () => fetchCupGames(year),
    staleTime: year === current ? 10 * 60 * 1000 : Infinity,
    // While a Cup game is on, keep the table fresh.
    refetchInterval: (query) =>
      year === current &&
      query.state.data?.some((g) => !g.completed && Date.parse(g.date) < Date.now() + 3 * 60 * 60 * 1000 && Date.parse(g.date) > Date.now() - 4 * 60 * 60 * 1000)
        ? 60_000
        : false,
  });
}

export function usePostseason(season: number, enabled = true) {
  const current = currentSeason();
  return useQuery({
    queryKey: ['postseason', season],
    enabled,
    queryFn: () => fetchPostseason(season),
    staleTime: season === current ? 5 * 60 * 1000 : Infinity,
    // Games in progress move the series score.
    refetchInterval: (query) =>
      season === current && query.state.data?.playoffs.some((g) => !g.completed && Date.parse(g.date) < Date.now() + 3 * 3600_000 && Date.parse(g.date) > Date.now() - 4 * 3600_000)
        ? 60_000
        : false,
  });
}

export function usePlayerProfile(athleteId?: string | null) {
  return useQuery({
    queryKey: ['playerProfile', athleteId],
    queryFn: () => fetchPlayerProfile(athleteId!),
    enabled: !!athleteId,
    staleTime: 6 * HOUR,
  });
}

/** Start reading the meeting history of two teams ahead of the page that shows it (the away team first, as it reads it). */
export function prefetchHeadToHead(client: QueryClient, teamId?: string | null, rivalId?: string | null) {
  if (!teamId || !rivalId || teamId === rivalId) return;
  client.prefetchQuery({ queryKey: ['headToHead', teamId, rivalId], queryFn: () => fetchHeadToHead(teamId, rivalId), staleTime: 6 * HOUR });
}

export function useHeadToHead(teamId?: string | null, rivalId?: string | null) {
  return useQuery({
    queryKey: ['headToHead', teamId, rivalId],
    queryFn: () => fetchHeadToHead(teamId!, rivalId!),
    enabled: !!teamId && !!rivalId && teamId !== rivalId,
    staleTime: 6 * HOUR,
  });
}

export function usePlayerBio(athleteId?: string | null) {
  return useQuery({
    queryKey: ['playerBio', athleteId],
    queryFn: () => fetchPlayerBio(athleteId!),
    enabled: !!athleteId,
    staleTime: 6 * HOUR,
  });
}

/** Every All-Star Game roster since 2003, read once (it never changes) and kept. */
export function useAllStars(enabled = true) {
  return useQuery({
    queryKey: ['allStars'],
    queryFn: fetchAllStars,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * The two teams of a game that is still loading, found in data the app already has (a scoreboard it showed, or a team's
 * schedule). Lets the game page paint its team colors from the first frame instead of switching when the game arrives.
 */
export function useGameTeams(gameId?: string | null): { awayId: string; homeId: string } | null {
  const client = useQueryClient();
  if (!gameId) return null;
  for (const q of client.getQueryCache().findAll({ queryKey: ['scoreboard'] })) {
    const g = (q.state.data as ScoreboardGame[] | undefined)?.find((x) => x.id === gameId);
    if (g) return { awayId: g.away.teamId, homeId: g.home.teamId };
  }
  for (const q of client.getQueryCache().findAll({ queryKey: ['schedule'] })) {
    const g = (q.state.data as Game[] | undefined)?.find((x) => x.id === gameId);
    const teamId = String(q.queryKey[1] ?? '');
    if (g && teamId && g.opponentId) return g.home ? { homeId: teamId, awayId: g.opponentId } : { homeId: g.opponentId, awayId: teamId };
  }
  return null;
}

/** Game logs of several players at once (the same cached queries the player page uses). */
export function usePlayerGameLogs(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['playerGameLog', id],
      queryFn: () => fetchPlayerGameLog(id),
      staleTime: 30 * 60 * 1000,
    })),
  });
}

/**
 * One player's shots over several finished games. Each game's play-by-play is its own request (and the same cached query the
 * game page uses, so games already opened cost nothing), so nothing loads until `enabled`.
 */
export function usePlayerShots(athleteId: string, gameIds: string[], enabled: boolean) {
  const results = useQueries({
    queries: gameIds.map((id) => ({
      queryKey: ['game', id],
      queryFn: () => fetchGameSummary(id),
      enabled,
      staleTime: Infinity,
    })),
  });
  const loaded = results.filter((r) => r.data).length;
  const shots = results.flatMap((r) => (r.data ? shotsOf(r.data.plays, athleteId) : []));
  return { shots, loaded, total: gameIds.length };
}

/** Reads the scoreboards of a local day ahead of time (a page the pager is likely to come to), into the same cache the pages use. */
export function prefetchGamesOnDay(client: QueryClient, day: Date) {
  for (const key of scoreboardKeysFor(day)) {
    client.prefetchQuery({ queryKey: ['scoreboard', key], queryFn: scoreboardQueryFn(client, key), staleTime: 5 * 60 * 1000 });
  }
}
