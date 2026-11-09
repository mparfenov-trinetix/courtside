import { useState } from 'react';
import { useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { InjuryReport, TransactionList } from '../../components';
import { ListSkeleton, PaneTitle, ScreenHeader } from '@/components';
import { useAfterSettle } from '@/hooks';
import { palette } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';

const LABELS = ['Injuries', 'Moves'];

/**
 * The league's wire: every team's injury report, and the season's signings, waivers and trades, side by side as in the Playoffs screen: swipe
 * sideways between them (the title says which, with a dot per pane).
 */
export function WireScreen() {
  const { width } = useWindowDimensions();
  const favoriteTeamId = useScreenTeamStore((s) => s.favoriteTeamId);
  const page = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    page.set(e.contentOffset.x / width);
  });
  // The pane on screen; the other is built once the screen has settled (or when swiped to), a skeleton until then.
  const [pane, setPane] = useState(0);
  const settled = useAfterSettle(700);

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title={<PaneTitle labels={LABELS} page={page} />} />
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => setPane(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}>
        <View style={{ width }}>
          <InjuryReport favoriteTeamId={favoriteTeamId} />
        </View>
        <View style={{ width }}>{settled || pane === 1 ? <TransactionList /> : <ListSkeleton count={7} avatar="round" />}</View>
      </Animated.ScrollView>
    </View>
  );
}
