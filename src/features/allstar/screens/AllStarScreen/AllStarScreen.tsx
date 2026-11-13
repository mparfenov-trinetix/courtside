import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AllStarGames, AllStarPlayers, MissingGameNote, WeekendHero } from '../../components';
import { EmptyState, ErrorState, ListSkeleton, ScreenHeader, SeasonButton, SeasonSheet } from '@/components';
import { useAllStarWeekend, useRefresh } from '@/hooks';
import { allStarSeasons, currentSeason } from '@/lib/espn';
import { palette } from '@/lib/theme';
import { EventsBack } from '@/features/events';

/**
 * All-Star Weekend by year: the game (or games, the format has changed over the years), who played and the MVP. The dunk, three-point and
 * skills contests are not in ESPN's data, so they are not here.
 */
export function AllStarScreen() {
  const insets = useSafeAreaInsets();
  const seasons = allStarSeasons();
  const [season, setSeason] = useState(seasons[0]);
  const [picking, setPicking] = useState(false);
  const { data, isPending, error, refetch } = useAllStarWeekend(season);
  const refreshControl = useRefresh([['allStarWeekend', season]], season === currentSeason());

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="All-Star Weekend" afterMenu={<EventsBack />} right={<SeasonButton season={season} label={String} noun="year" onPress={() => setPicking(true)} />} />
      {isPending ? (
        <ListSkeleton count={4} avatar="square" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : data.games.length === 0 && data.mvps.length === 0 ? (
        <EmptyState title="No game found" text={`ESPN has no All-Star Game for ${season}.`} placement="center" />
      ) : (
        <ScrollView refreshControl={refreshControl} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <WeekendHero weekend={data} />
          <AllStarGames games={data.games} />
          <MissingGameNote weekend={data} />
          <AllStarPlayers players={data.players} games={data.games} />
        </ScrollView>
      )}
      <SeasonSheet visible={picking} season={season} seasons={seasons} label={String} title="Year" onPick={setSeason} onClose={() => setPicking(false)} />
    </View>
  );
}
