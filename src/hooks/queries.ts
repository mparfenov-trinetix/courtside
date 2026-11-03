import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import {
  fetchGameSummary,
  fetchCupGames,
  fetchLeagueLeaders,
  fetchPostseason,
  currentSeason,
  fetchPlayerCareer,
  fetchPlayerProfile,
  fetchPlayerGameLog,
  fetchPlayerStats,
  fetchRoster,
  fetchScoreboardByDate,
  fetchStandings,
  fetchTeamDetail,
  fetchLeagueTeamStats,
  fetchTeams,
  searchPlayers,
  fetchTeamSchedule,
} from '@/lib/espn';

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

export function useLeagueLeaders() {
  return useQuery({
    queryKey: ['leaders'],
    queryFn: fetchLeagueLeaders,
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

export function useGameSummary(gameId?: string | null) {
  // A page buried under others must not keep polling ESPN for a game nobody is looking at.
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: () => fetchGameSummary(gameId!),
    enabled: !!gameId,
    // A finished game never changes, so it never needs refetching.
    staleTime: (query) => (query.state.data?.completed ? Infinity : 30 * 60 * 1000),
    refetchInterval: (query) => (focused && query.state.data?.live ? 15_000 : false),
  });
}

export function useScoreboardByDate(date: string) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['scoreboard', date],
    queryFn: () => fetchScoreboardByDate(date),
    staleTime: 5 * 60 * 1000, // 5 min — scores change during games
    refetchInterval: (query) => (focused && query.state.data?.some((g) => g.inProgress) ? 20_000 : false),
    enabled: !!date,
  });
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
    queryKey: ['playerSearch', q.toLowerCase()],
    queryFn: () => searchPlayers(q),
    enabled: q.length >= 2,
    staleTime: HOUR,
  });
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

export function usePostseason(season: number) {
  const current = currentSeason();
  return useQuery({
    queryKey: ['postseason', season],
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
