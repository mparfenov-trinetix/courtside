import { queryOptions, useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  fetchGameSummary,
  fetchGameVideos,
  fetchPastPregame,
  fetchHeadToHead,
  fetchAllStars,
  fetchAllStarWeekend,
  fetchDraft,
  fetchSeasonAwards,
  fetchNews,
  fetchArticle,
  fetchFutures,
  fetchPowerIndex,
  fetchInjuries,
  fetchTransactions,
  findPlayerByName,
  type NbaDraftPlayer,
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
  fetchTeamRated,
  fetchTeamStar,
  fetchLeagueTeamStats,
  fetchTeams,
  searchPlayers,
  fetchTeamSchedule,
  fetchTeamSeason,
  type Game,
  type GameVideo,
  type LeaderCategory,
  type PlayerSeasonStats,
  type ScoreboardGame,
} from '@/lib/espn';
import { parseEspnDate, scoreboardKeysFor, startsOnDay, toDateKey } from '@/lib/date';
import { NOTED_FROM, isMatchupStar, type StartedGame, conferenceMap, inferPlayoffNotes, playoffSeeds, seedMap } from '@/lib/league';
import { awaitsTipOff, boardPhase, gamePhase, shotsOf } from '@/lib/game';
import { findGameRecap, recapQuery, searchVideos, type RecapGame, type SearchVideo } from '@/lib/youtube';

const HOUR = 60 * 60 * 1000;

// The queries a screen opens with are also read ahead (the intro does it, see `IntroOverlay`), so the options live here and the hook and
// the prefetch cannot drift apart: a prefetch under another key or stale time warms nothing.
export const teamsOptions = () =>
  queryOptions({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 24 * HOUR, // team list basically never changes
  });

export function useTeams() {
  return useQuery(teamsOptions());
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

/** A team's best player by ESPN's rating (the form widget's free corner); null before anyone is rated. */
export function useTeamStar(teamId?: string | null, season: number = currentSeason()) {
  return useQuery({
    queryKey: ['teamStar', teamId, season],
    queryFn: () => fetchTeamStar(teamId!, season),
    enabled: !!teamId,
    // A finished season's best player never changes.
    staleTime: season < currentSeason() ? Infinity : 6 * HOUR,
  });
}

/** A team's best rated players, best first, with positions: what a game's key matchup is picked from. */
export function useTeamRated(teamId?: string | null) {
  return useQuery({
    queryKey: ['teamRated', teamId, currentSeason()],
    // Only the scorers of a key matchup get their record read (see `fetchTeamRated`).
    queryFn: () => fetchTeamRated(teamId!, 6, isMatchupStar),
    enabled: !!teamId,
    staleTime: 6 * HOUR,
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
export const seasonGamesOptions = (teamId: string | null | undefined, season: number) =>
  queryOptions({
    queryKey: ['teamSeason', teamId, season],
    queryFn: () => fetchTeamSeason(teamId!, season),
    enabled: !!teamId,
    staleTime: season === currentSeason() ? 30 * 60 * 1000 : Infinity,
  });

export function useSeasonGames(teamId: string | null | undefined, season: number) {
  return useQuery(seasonGamesOptions(teamId, season));
}

/** One category of the league leaders (the top `limit`). The second part of the key is the shape of the data: bump it if it changes. */
export const leaderCategoryOptions = (category: LeaderCategory, limit = 50) =>
  queryOptions({
    queryKey: ['leaders', 6, category, limit],
    queryFn: () => fetchLeaderCategory(category, limit),
    staleTime: HOUR,
  });

export function useLeaderCategory(category: LeaderCategory, limit = 50, enabled = true) {
  return useQuery({ ...leaderCategoryOptions(category, limit), enabled });
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
function refreshAfterFinal(client: QueryClient) {
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
      enabled,
      queryKey: ['game', id],
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

/**
 * What ESPN said before tip-off about a game that is over (win chance and closing line), read from the core API because the summary drops
 * it once the game has started. Never changes, so it is read once and kept (and persisted).
 */
export function usePastPregame(gameId: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['gamePregame', gameId],
    queryFn: () => fetchPastPregame(gameId),
    staleTime: Infinity,
  });
}

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
 * The video of a finished game on YouTube, the "Game Recap" of the Motion Station channel (the one Sofascore plays), or null while it has
 * none (it puts them up within hours of the final buzzer). One search per game, any date; a video that was found is kept for good (and
 * persisted), a miss is tried again every five minutes while the page of a recent game is open, and when a page opens after five minutes.
 */
export function useGameVideo(game: RecapGame & { id: string }, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['gameRecapVideo', game.id],
    queryFn: async (): Promise<SearchVideo | null> => findGameRecap(await searchVideos(recapQuery(game)), game) ?? null,
    staleTime: (q) => (q.state.data ? Infinity : 5 * 60 * 1000),
    // A recap that is not up yet shows up within hours of the final buzzer: while the page of a game from the last two days is open,
    // look again every five minutes (a miss used to be retried only when the page was opened again). An older game with no video stops.
    refetchInterval: (q) => (q.state.data || !recentGame(game.date) ? false : 5 * 60 * 1000),
  });
}

/** The game started within the last two days (or has no date to tell). */
function recentGame(date?: string): boolean {
  const start = date ? parseEspnDate(date).getTime() : NaN;
  return Number.isNaN(start) || Date.now() - start < 2 * 24 * 60 * 60 * 1000;
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

/** `enabled: false` reads nothing from the network (a page that is only being scrolled past); what is cached is still returned. */
function useScoreboardByDate(date: string, enabled = true) {
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

/**
 * The season lines of a whole roster, one cached read per player (the same `['playerStats', id]` queries the player pages and Compare use, so
 * a player opened before is already there). `enabled` holds the reads back until a view that shows them is open.
 */
export function useRosterStats(ids: string[], enabled: boolean) {
  const queries = useQueries({
    queries: ids.map((id) => ({ enabled, queryKey: ['playerStats', id], queryFn: () => fetchPlayerStats(id), staleTime: HOUR })),
  });
  const byId = new Map<string, PlayerSeasonStats | undefined>(ids.map((id, i) => [id, queries[i]?.data]));
  return { statsOf: (id: string) => byId.get(id), pending: enabled && queries.some((q) => q.isPending), loaded: queries.filter((q) => q.data).length };
}

/**
 * Who started each of a team's last `count` finished games and whether it won: from the box scores, through the same cached `['game', id]`
 * query the game page reads (a finished game never changes, so each is read once). ESPN has no lineup feed; starting fives are what a box
 * score does say. `total` is how many games were asked for, `done` how many have come back.
 */
export function useRecentStarts(teamId: string | null | undefined, enabled: boolean, count = 10) {
  const { data: schedule } = useTeamSchedule(enabled ? teamId : undefined);
  const recent = (schedule ?? [])
    .filter((g) => g.completed && g.result)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count);
  const queries = useQueries({
    queries: recent.map((g) => ({
      enabled,
      queryKey: ['game', g.id],
      queryFn: () => fetchGameSummary(g.id),
      staleTime: Infinity,
    })),
  });
  const games: StartedGame[] = [];
  queries.forEach((q, i) => {
    const summary = q.data;
    const game = recent[i];
    if (!summary || !game) return;
    const side = summary.home.team.id === teamId ? summary.home : summary.away.team.id === teamId ? summary.away : undefined;
    if (!side) return;
    games.push({ gameId: game.id, won: game.result === 'W', starterIds: side.starters.map((p) => p.id) });
  });
  return { games, total: recent.length, done: queries.filter((q) => q.data).length, pending: enabled && (!schedule || queries.some((q) => q.isPending)) };
}

export function usePlayerGameLog(athleteId?: string | null) {
  return useQuery({
    queryKey: ['playerGameLog', athleteId],
    queryFn: () => fetchPlayerGameLog(athleteId!),
    enabled: !!athleteId,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * A player's games over the last `count` seasons (the current one first), each season its own cached read: a finished season never changes. The
 * current season shares the key of `usePlayerGameLog`.
 */
/** A player's game logs for `count` seasons, newest first, ending at `endSeason` (the season in progress by default: a past game's head to head ends at its own season). */
export function usePlayerSeasonLogs(athleteId: string | null | undefined, count = 3, endSeason?: number) {
  const current = currentSeason();
  const seasons = Array.from({ length: count }, (_, i) => Math.min(endSeason ?? current, current) - i);
  return useQueries({
    queries: seasons.map((season) => ({
      queryKey: season === current ? ['playerGameLog', athleteId] : ['playerGameLog', athleteId, season],
      queryFn: () => fetchPlayerGameLog(athleteId!, season === current ? undefined : season),
      enabled: !!athleteId,
      staleTime: season === current ? 30 * 60 * 1000 : Infinity,
    })),
  });
}

export function usePlayerSearch(query: string) {
  const q = query.trim();
  const { data: teams } = useTeams();
  return useQuery({
    // A shape version: the older feed's results (current players only) are not reused.
    queryKey: ['playerSearch', 2, q.toLowerCase()],
    queryFn: () => searchPlayers(q),
    enabled: q.length >= 2,
    staleTime: HOUR,
    // The feed names a team but has no id: a team still in the league gets its id and abbreviation (a retired player's old club may not).
    select: (rows) =>
      rows.map((p) => {
        const team = teams?.find((t) => t.displayName === p.teamName);
        return team ? { ...p, teamId: team.id, teamAbbr: team.abbreviation } : p;
      }),
  });
}

export const leagueTeamStatsOptions = () =>
  queryOptions({
    queryKey: ['leagueTeamStats'],
    queryFn: fetchLeagueTeamStats,
    staleTime: HOUR,
  });

export function useLeagueTeamStats() {
  return useQuery(leagueTeamStatsOptions());
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

/**
 * A season's postseason as every reader of the `['postseason', season]` cache must see it: before 2009-10 ESPN's notes do not name the rounds,
 * so they are worked out from the series. One function for every reader of that key, because whoever fetches first fills the cache for the
 * rest: the seeds beside a team in a game once filled it with the raw games, and the old season's bracket was left empty by it.
 */
const loadPostseason = (season: number) =>
  fetchPostseason(season).then((p) => (season < NOTED_FROM ? { ...p, playoffs: inferPlayoffNotes(p.playoffs, conferenceMap(p.standings)) } : p));

export function usePostseason(season: number, enabled = true) {
  const current = currentSeason();
  return useQuery({
    queryKey: ['postseason', season],
    enabled,
    queryFn: () => loadPostseason(season),
    staleTime: season === current ? 5 * 60 * 1000 : Infinity,
    // Games in progress move the series score.
    refetchInterval: (query) =>
      season === current && query.state.data?.playoffs.some((g) => !g.completed && Date.parse(g.date) < Date.now() + 3 * 3600_000 && Date.parse(g.date) > Date.now() - 4 * 3600_000)
        ? 60_000
        : false,
  });
}

/**
 * Each team's playoff seed for a season, for the "(3)" next to a team in a playoff game. Built from the season's playoff games (the
 * same data as the bracket, shared through its cache), so it is only asked for when `enabled` (the game is a playoff game); a seed
 * never changes once the series are set, so it is kept for hours and persisted.
 */
export function usePlayoffSeeds(season: number | undefined, enabled: boolean) {
  const client = useQueryClient();
  const year = season ?? currentSeason();
  const { data } = useQuery({
    queryKey: ['playoffSeeds', year],
    enabled: enabled && season != null,
    staleTime: year === currentSeason() ? 6 * HOUR : Infinity,
    queryFn: async () => {
      const post = await client.ensureQueryData({ queryKey: ['postseason', year], queryFn: () => loadPostseason(year) });
      return playoffSeeds(post.playoffs, seedMap(post.standings));
    },
  });
  // The cache may hold this season's seeds from a playoff game seen earlier: a game that is not a playoff game must not show them.
  return enabled ? data : undefined;
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
/** One season's All-Star Game day: its games, who played, the MVP. A finished one never changes (kept for good, and on disk). */
/** ESPN's Basketball Power Index for every team: the rating and its projection of the season. It is rerun daily. */
export function usePowerIndex() {
  return useQuery({ queryKey: ['powerIndex', currentSeason()], queryFn: () => fetchPowerIndex(currentSeason()), staleTime: 60 * 60 * 1000 });
}

/** Every team's injury report. It changes through the day, so it is read again after ten minutes. */
export function useInjuries() {
  return useQuery({ queryKey: ['injuries'], queryFn: fetchInjuries, staleTime: 10 * 60 * 1000 });
}

/** The newest `limit` moves of the season. `placeholderData` keeps the page on screen while a longer one is read. */
export function useTransactions(limit: number) {
  return useQuery({ queryKey: ['transactions', limit], queryFn: () => fetchTransactions(limit), staleTime: 10 * 60 * 1000, placeholderData: (previous) => previous });
}

/** The sportsbook odds for the season's title, conferences and awards (`withAthletes`: the award candidates' names and photos, about forty more requests). They move, so they are read again after half an hour. */
export function useFutures(withAthletes = true) {
  return useQuery({
    queryKey: ['futures', currentSeason(), withAthletes],
    queryFn: () => fetchFutures(currentSeason(), withAthletes),
    staleTime: 30 * 60 * 1000,
  });
}

/** One year's draft: every pick with its player. A finished one never changes (kept for good, and on disk). */
export function useDraft(season: number) {
  return useQuery({
    queryKey: ['draft', season],
    queryFn: () => fetchDraft(season),
    staleTime: season >= currentSeason() ? HOUR : Infinity,
    gcTime: Infinity,
  });
}

/** The latest NBA news: the league's, or one team's. ESPN files a new story every few minutes on a busy day, so it is read afresh every five. */
export function useNews(teamId?: string, enabled = true) {
  return useQuery({
    queryKey: ['news', teamId ?? 'league'],
    queryFn: () => fetchNews(teamId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** One article's text. A published article does not change, so it is kept for the session. */
export function useArticle(id: string) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const article = await fetchArticle(id);
      if (!article) throw new Error('ESPN has no text for this article.');
      return article;
    },
    staleTime: Infinity,
  });
}

/** One season's awards: the winners of each award and the All-NBA, All-Defensive and All-Rookie teams. A past season never changes (kept for good, and on disk). */
export function useSeasonAwards(season: number) {
  return useQuery({
    queryKey: ['seasonAwards', season],
    queryFn: () => fetchSeasonAwards(season),
    staleTime: season >= currentSeason() ? HOUR : Infinity,
    gcTime: Infinity,
  });
}

/**
 * Who a draft pick is in ESPN's NBA pages: his id and photo. From 2019 the draft record already says (`nbaId`); before that, and for
 * players who came from abroad, he is found by his name, only for the rows on screen. Kept for good (a name does not change owners).
 */
export function useDrafteeIdentity(player?: NbaDraftPlayer): { id?: string; headshot?: string } {
  const { data } = useQuery({
    queryKey: ['draftee', player?.id],
    enabled: !!player && !player.nbaId,
    queryFn: () => findPlayerByName(player!.name),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  if (player?.nbaId) return { id: player.nbaId, headshot: player.headshot };
  return { id: data?.id, headshot: data?.headshot };
}

export function useAllStarWeekend(season: number) {
  return useQuery({
    queryKey: ['allStarWeekend', season],
    queryFn: () => fetchAllStarWeekend(season),
    staleTime: season === currentSeason() ? HOUR : Infinity,
    gcTime: Infinity,
  });
}

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
