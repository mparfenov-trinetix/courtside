import { useQuery } from '@tanstack/react-query';

import {
  fetchGameSummary,
  fetchLeagueLeaders,
  fetchPlayerStats,
  fetchRoster,
  fetchStandings,
  fetchTeamDetail,
  fetchTeams,
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
    staleTime: 30 * 60 * 1000,
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
