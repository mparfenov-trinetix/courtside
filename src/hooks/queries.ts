import { useQuery } from '@tanstack/react-query';

import {
  fetchGameSummary,
  fetchLeagueLeaders,
  fetchPlayerCareer,
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

export function useStandings() {
  return useQuery({
    queryKey: ['standings'],
    queryFn: fetchStandings,
    staleTime: 30 * 60 * 1000,
  });
}

export function useGameSummary(gameId?: string | null) {
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: () => fetchGameSummary(gameId!),
    enabled: !!gameId,
    // A finished game never changes, so it never needs refetching.
    staleTime: (query) => (query.state.data?.completed ? Infinity : 30 * 60 * 1000),
    refetchInterval: (query) => (query.state.data?.live ? 15_000 : false),
  });
}

export function useScoreboardByDate(date: string) {
  return useQuery({
    queryKey: ['scoreboard', date],
    queryFn: () => fetchScoreboardByDate(date),
    staleTime: 5 * 60 * 1000, // 5 min — scores change during games
    refetchInterval: (query) => (query.state.data?.some((g) => g.inProgress) ? 20_000 : false),
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
