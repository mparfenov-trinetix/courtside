import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useStandings, useTeam, useTeamDetail, useTeamSchedule, useTeamStar } from '@/hooks';
import { fetchGameSummary } from '@/lib/espn';
import { conferenceStanding } from '@/lib/league';
import { liveScoreOf } from '@/lib/widgets';
import { useTeamStore } from '@/state';
import { syncWidgets } from './sync';

/** Keeps the home-screen widget on your favorite team's upcoming games, whenever that data changes. */
export function useWidgetSync() {
  const favoriteTeamId = useTeamStore((s) => s.favoriteTeamId);
  const team = useTeam(favoriteTeamId);
  const { data: detail } = useTeamDetail(favoriteTeamId);
  const { data: schedule } = useTeamSchedule(favoriteTeamId);
  const { data: star } = useTeamStar(favoriteTeamId);
  const { data: standings } = useStandings();
  const standing = conferenceStanding(standings, favoriteTeamId);

  // The favorite team's game that should be on (tipped off, not marked finished): its score goes onto the widget while it is
  // played. The same query (and polling) the Live Activity and the game page use, so it costs no extra requests.
  const nowMs = new Date().getTime();
  const onNow = schedule?.find((g) => !g.completed && g.date && Date.parse(g.date) <= nowMs && nowMs < Date.parse(g.date) + 4 * 60 * 60 * 1000);
  const game = useQuery({
    queryKey: ['game', onNow?.id],
    queryFn: () => fetchGameSummary(onNow!.id),
    enabled: !!onNow,
    refetchInterval: (q) => (q.state.data?.completed ? false : 15_000),
  });
  const live = liveScoreOf(game.data, favoriteTeamId);
  // One value for the effect to watch, so the widget is pushed when the score or the clock changes, not on every render.
  const liveKey = live ? `${live.gameId}|${live.myScore}|${live.oppScore}|${live.clock}` : '';

  useEffect(() => {
    if (team && schedule) syncWidgets(team, detail ? { ...detail, standing: standing ?? detail.standing } : undefined, schedule, live, star);
    // `live` is read through `liveKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, detail, schedule, standing, star, liveKey]);
}
