import { useEffect } from 'react';

import { useTeam, useTeamDetail, useTeamSchedule } from '@/hooks/queries';
import { useTeamStore } from '@/state/team-store';
import { syncNextGameWidget } from '@/widgets/sync';

/** Keeps the home-screen widget on your favorite team's upcoming games, whenever that data changes. */
export function useWidgetSync() {
  const { favoriteTeamId } = useTeamStore();
  const team = useTeam(favoriteTeamId);
  const { data: detail } = useTeamDetail(favoriteTeamId);
  const { data: schedule } = useTeamSchedule(favoriteTeamId);

  useEffect(() => {
    if (team && schedule) syncNextGameWidget(team, detail, schedule);
  }, [team, detail, schedule]);
}
