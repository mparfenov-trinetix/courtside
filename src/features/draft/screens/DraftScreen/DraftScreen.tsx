import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraftHero, PickRow } from '../../components';
import { EmptyState, ErrorState, ListSkeleton, ScreenHeader, SectionLabel, YearStrip } from '@/components';
import { useDraft, useRefresh, useTeams } from '@/hooks';
import { currentSeason, draftSeasons, type NbaDraftPick } from '@/lib/espn';
import { palette, space } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';

type Item = { key: string; round: number } | { key: string; pick: NbaDraftPick };
const ROUND_NAMES: Record<number, string> = { 1: 'First round', 2: 'Second round' };

/** The NBA Draft by year, 2003 on: every pick with its player, size, college and team, ESPN's scouting report one tap away. */
export function DraftScreen() {
  const insets = useSafeAreaInsets();
  const seasons = draftSeasons();
  const [season, setSeason] = useState(seasons[0]);
  const { data, isPending, error, refetch } = useDraft(season);
  const { data: teams } = useTeams();
  const favoriteTeamId = useScreenTeamStore((s) => s.favoriteTeamId);
  const refreshControl = useRefresh([['draft', season]], season >= currentSeason());
  const teamOf = (id: string) => teams?.find((t) => t.id === id);

  // The picks with a heading before each round.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let round = 0;
    for (const pick of data?.picks ?? []) {
      if (pick.round !== round) {
        round = pick.round;
        out.push({ key: `round-${round}`, round });
      }
      out.push({ key: `pick-${pick.overall}`, pick });
    }
    return out;
  }, [data]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="NBA Draft" />
      <YearStrip seasons={seasons} value={season} onChange={setSeason} />
      {isPending ? (
        <ListSkeleton count={7} avatar="round" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : data.picks.length === 0 ? (
        <EmptyState title="No draft found" text={`ESPN has no picks for ${season}.`} placement="center" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          initialNumToRender={9}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListHeaderComponent={<DraftHero draft={data} teamOf={teamOf} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: space.sm }}
          renderItem={({ item }) =>
            'round' in item ? (
              <SectionLabel style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>{ROUND_NAMES[item.round] ?? `Round ${item.round}`}</SectionLabel>
            ) : (
              <View style={{ paddingHorizontal: space.lg }}>
                <PickRow pick={item.pick} team={teamOf(item.pick.teamId)} mine={!!favoriteTeamId && item.pick.teamId === favoriteTeamId} />
              </View>
            )
          }
        />
      )}
    </View>
  );
}
