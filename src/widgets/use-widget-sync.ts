import { useEffect } from 'react';

import { useStandings, useTeam, useTeamDetail, useTeamSchedule } from '@/hooks';
import { conferenceStanding } from '@/lib/league';
import { useTeamStore } from '@/state';
import { syncWidgets } from './sync';

/** Keeps the home-screen widget on your favorite team's upcoming games, whenever that data changes. */
export function useWidgetSync() {
  const favoriteTeamId = useTeamStore((s) => s.favoriteTeamId);
  const team = useTeam(favoriteTeamId);
  const { data: detail } = useTeamDetail(favoriteTeamId);
  const { data: schedule } = useTeamSchedule(favoriteTeamId);
  const { data: standings } = useStandings();
  const standing = conferenceStanding(standings, favoriteTeamId);

  useEffect(() => {
    if (team && schedule) syncWidgets(team, detail ? { ...detail, standing: standing ?? detail.standing } : undefined, schedule);
  }, [team, detail, schedule, standing]);
}
