import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { ListSkeleton, PaneTitle, ScreenHeader } from '@/components';
import { useSceneSettled, useAppWindow } from '@/hooks';
import { NewsScreen } from '@/features/news';
import { InjuryReport, TransactionList } from '@/features/wire';
import { palette } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';

const LABELS = ['News', 'Injuries', 'Moves'];
const PANES = ['news', 'injuries', 'moves'];

/**
 * What is going on around the league, in one screen of three panes side by side (as the Playoffs screen has its two): ESPN's news (recaps,
 * previews, stories, videos), every team's injury report, and the season's signings, waivers and trades. Swipe between them; the title says
 * which one is on screen, with a dot for each. `pane` (a prop, or the route's param) opens one; the old `/news` and `/wire` routes render this with it set.
 */
export function AroundScreen({ pane: opened }: { pane?: 'news' | 'injuries' | 'moves' } = {}) {
  const { width } = useAppWindow();
  const params = useLocalSearchParams<{ pane?: string }>();
  const start = Math.max(0, PANES.indexOf(opened ?? params.pane ?? 'news'));
  const favoriteTeamId = useScreenTeamStore((s) => s.favoriteTeamId);
  const page = useSharedValue(start);
  const onScroll = useAnimatedScrollHandler((e) => {
    page.set(e.contentOffset.x / width);
  });
  // The pane on screen is built at once; the others once the slide in from the menu is over (or when swiped to), a skeleton until then.
  const [pane, setPane] = useState(start);
  const settled = useSceneSettled(150);
  const ready = (i: number) => i === start || i === pane || settled;

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title={<PaneTitle labels={LABELS} page={page} />} />
      <Animated.ScrollView
        // Turned to a new width the pager starts again on the pane it was on.
        key={`${start}-${width}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: pane * width, y: 0 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => setPane(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}>
        <View style={{ width }}>{ready(0) ? <NewsScreen embedded /> : <ListSkeleton count={6} avatar="square" />}</View>
        <View style={{ width }}>{ready(1) ? <InjuryReport favoriteTeamId={favoriteTeamId} /> : <ListSkeleton count={7} avatar="round" />}</View>
        <View style={{ width }}>{ready(2) ? <TransactionList /> : <ListSkeleton count={7} avatar="round" />}</View>
      </Animated.ScrollView>
    </View>
  );
}
