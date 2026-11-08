import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View, type FlatList, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { ErrorState, ListSkeleton, ScreenHeader } from '@/components';
import { useLeagueTeamStats, useTeams } from '@/hooks';
import { TEAM_METRICS } from '@/lib/league';
import { palette } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';
import { StatPills } from '../../components';
import { BpiPage } from './BpiPage';
import { MetricPage } from './MetricPage';
import { TAB_LABEL } from './constants';

/** Moves of up to this many stats slide; further ones jump (sliding through half the list would mean drawing it). */
const NEAR = 2;
const JUMP_MS = 340;
/** The pager's pages: ESPN's power index first, then one page per team stat. */
const PAGES: { key: string; label: string; metric?: (typeof TEAM_METRICS)[number] }[] = [
  { key: 'bpi', label: 'BPI' },
  ...TEAM_METRICS.map((m) => ({ key: m.key as string, label: TAB_LABEL[m.key] ?? m.short, metric: m })),
];
const LABELS = PAGES.map((p) => p.label);

/**
 * Every team ranked by one stat. The stats are a pager like the rosters and the day view: swipe sideways, or tap a pill; the
 * strip's glass highlight follows the pager frame by frame, and a long move glides the strip while the pager itself jumps (under a
 * quick dip of the page, so the cut is not seen). The choice lives in the `stat` route param, which links into this screen set.
 */
export function TeamLeadersScreen() {
  const { width } = useWindowDimensions();
  const { stat } = useLocalSearchParams<{ stat?: string }>();
  const found = PAGES.findIndex((p) => p.key === stat);
  const index = found >= 0 ? found : Math.max(0, PAGES.findIndex((p) => p.key === 'ppg'));
  const currentTeamId = useScreenTeamStore((s) => s.currentTeamId);
  const { data: rows, isPending, error, refetch } = useLeagueTeamStats();
  const { data: teams } = useTeams();

  const pagerRef = useRef<FlatList>(null);
  // The page the pager is on or heading to.
  const at = useRef(index);
  // The pager's position as a fractional page: the strip's highlight follows it.
  const page = useSharedValue(index);
  // While a long jump plays the strip is animated here and the pager itself is moved in one step.
  const jumping = useSharedValue(false);
  const dip = useSharedValue(1);
  const onScroll = useAnimatedScrollHandler((e) => {
    if (jumping.get()) return;
    page.set(e.contentOffset.x / width);
  });
  const dipStyle = useAnimatedStyle(() => ({ opacity: dip.get() }));

  // A tap on a pill or a link changed the route param: bring the pager there.
  useEffect(() => {
    const from = at.current;
    if (index === from) return;
    at.current = index;
    if (Math.abs(index - from) > NEAR) {
      jumping.set(true);
      dip.set(withSequence(withTiming(0.3, { duration: 90 }), withTiming(1, { duration: JUMP_MS - 90 })));
      pagerRef.current?.scrollToIndex({ index, animated: false });
      page.set(
        withTiming(index, { duration: JUMP_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) jumping.set(false);
        }),
      );
    } else {
      pagerRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [index, jumping, page, dip]);

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const settled = Math.max(0, Math.min(PAGES.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (settled === at.current) return;
    at.current = settled;
    Haptics.selectionAsync();
    router.setParams({ stat: PAGES[settled].key });
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Team Leaders" color={palette.chalk} />

      <StatPills labels={LABELS} page={page} selected={index} onSelect={(i) => router.setParams({ stat: PAGES[i].key })} />

      {isPending ? (
        <ListSkeleton count={10} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <Animated.View style={[styles.pager, dipStyle]}>
          <Animated.FlatList
            ref={pagerRef}
            data={PAGES}
            horizontal
            pagingEnabled
            keyExtractor={(p) => p.key}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            // The stat on screen and one on each side.
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onSettled}
            renderItem={({ item }) =>
              item.metric ? (
                <MetricPage metric={item.metric} rows={rows ?? []} teams={teams} currentTeamId={currentTeamId} width={width} />
              ) : (
                <BpiPage teams={teams} currentTeamId={currentTeamId} width={width} />
              )
            }
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1 },
});
