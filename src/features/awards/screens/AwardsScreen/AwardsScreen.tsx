import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AwardSection, AwardsHero } from '../../components';
import { EmptyState, ErrorState, ListSkeleton, ScreenHeader, SeasonButton, SeasonSheet } from '@/components';
import { useRefresh, useSeasonAwards, useTeams } from '@/hooks';
import { awardSeasons, currentSeason, teamInSeason } from '@/lib/espn';
import { palette } from '@/lib/theme';
import { EventsBack } from '@/features/events';
import { READABLE } from '@/lib/layout';

/**
 * The season awards by year, from 1999-00: MVP, Finals MVP, Defensive Player, Rookie, Sixth Man, Most Improved and Clutch Player of the Year, the
 * All-NBA, All-Defensive and All-Rookie teams, and the Cup's. ESPN holds only the winners (no voting, no runners-up), so that is all there is.
 */
export function AwardsScreen() {
  const insets = useSafeAreaInsets();
  const seasons = awardSeasons();
  const [season, setSeason] = useState(seasons[0]);
  const [picking, setPicking] = useState(false);
  const { data, isPending, error, refetch } = useSeasonAwards(season);
  const { data: teams } = useTeams();
  const refreshControl = useRefresh([['seasonAwards', season]], season >= currentSeason());
  // The team as it was called that season (a 1996 winner played for Seattle, not Oklahoma City).
  const teamOf = (id?: string) => (id ? teamInSeason(teams?.find((t) => t.id === id), season) : undefined);

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="Awards" afterMenu={<EventsBack />} right={<SeasonButton season={season} onPress={() => setPicking(true)} />} />
      {isPending ? (
        <ListSkeleton count={7} avatar="round" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : data.groups.length === 0 ? (
        <EmptyState title="No awards yet" text={`ESPN has no awards for the ${season - 1}-${String(season).slice(-2)} season yet. They are given out in the spring.`} placement="center" />
      ) : (
        <ScrollView refreshControl={refreshControl} showsVerticalScrollIndicator={false} contentContainerStyle={[READABLE, { paddingBottom: insets.bottom + 24 }]}>
          <AwardsHero awards={data} teamOf={teamOf} />
          {data.groups.map((group) => (
            <AwardSection key={group.key} group={group} teamOf={teamOf} />
          ))}
        </ScrollView>
      )}
      <SeasonSheet visible={picking} season={season} seasons={seasons} onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
